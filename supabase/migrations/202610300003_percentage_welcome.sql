-- Apply once AFTER 202610270001 and 202610270002. No payment integration.
-- Existing fixed-value coupons, used coupons, codes and expiry dates stay intact.
begin;
alter table public.ld_coupons alter column amount_cents drop not null;
alter table public.ld_coupons add column discount_percent integer
  check (discount_percent in (5,10,15,20,25));
alter table public.ld_coupons add constraint ld_coupon_discount_type
  check ((amount_cents is null) <> (discount_percent is null));

-- Private helpers used only by trusted server functions. Round once to cents.
create function public.ld_coupon_discount(p_coupon public.ld_coupons,p_subtotal_cents integer) returns integer
language sql immutable strict set search_path='' as $$
  select least(p_subtotal_cents,case when p_coupon.discount_percent is not null
    then ((p_subtotal_cents::bigint*p_coupon.discount_percent+50)/100)::integer
    else p_coupon.amount_cents end);
$$;
create function public.ld_welcome_percent(p_roll integer) returns integer
language sql immutable strict set search_path='' as $$
  select case when p_roll between 0 and 499 then 5
    when p_roll between 500 and 1499 then 10
    when p_roll between 1500 and 2999 then 15
    when p_roll between 3000 and 5499 then 20
    when p_roll between 5500 and 9999 then 25 end;
$$;
revoke all on function public.ld_coupon_discount(public.ld_coupons,integer),public.ld_welcome_percent(integer) from public,anon,authenticated;
grant execute on function public.ld_coupon_discount(public.ld_coupons,integer),public.ld_welcome_percent(integer) to service_role;

create or replace function public.ld_claim_welcome() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_coupon public.ld_coupons; v_roll bigint; v_percent integer; v_now timestamptz;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
  insert into public.ld_accounts(user_id) values(v_user) on conflict do nothing;
  perform 1 from public.ld_accounts where user_id=v_user for update;
  -- Unique lifetime grant per account/campaign; retries return the original coupon,
  -- even after use/expiry. Percentage and code are never accepted from the browser.
  select * into v_coupon from public.ld_coupons where user_id=v_user and campaign='welcome-v1';
  if v_coupon.id is not null then return public.ld_welcome_state(); end if;
  if exists(select 1 from public.ld_orders where user_id=v_user and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
  -- Reject the tiny excess range so every bucket has exactly the same weight.
  loop
    v_roll := (('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint);
    exit when v_roll < 4294960000;
  end loop;
  v_percent := public.ld_welcome_percent((v_roll % 10000)::integer);
  v_now := clock_timestamp();
  insert into public.ld_coupons(user_id,code,discount_percent,issued_at,expires_at)
  values(v_user,'LD-'||upper(replace(gen_random_uuid()::text,'-','')),v_percent,v_now,v_now+interval '24 hours');
  return public.ld_welcome_state();
end $$;

create or replace function public.ld_reserve_coupon(p_user_id uuid,p_order_id uuid,p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_order public.ld_orders; v_coupon public.ld_coupons;
begin
  insert into public.ld_accounts(user_id) values(p_user_id) on conflict do nothing;
  perform 1 from public.ld_accounts where user_id=p_user_id for update;
  select * into v_order from public.ld_orders where id=p_order_id and user_id=p_user_id for update;
  if v_order.id is null or v_order.status<>'pending' then raise exception 'INVALID_ORDER'; end if;
  select * into v_coupon from public.ld_coupons where code=upper(trim(p_code)) and user_id=p_user_id for update;
  if v_coupon.id is null then raise exception 'COUPON_NOT_FOUND'; end if;
  if v_coupon.status='reserved' and v_coupon.reserved_order_id=p_order_id then
    return jsonb_build_object('discount_cents',v_order.discount_cents,'expires_at',v_coupon.expires_at,'coupon_id',v_coupon.id);
  end if;
  if v_coupon.status<>'available' then raise exception 'COUPON_UNAVAILABLE'; end if;
  if v_coupon.expires_at<=clock_timestamp() then raise exception 'COUPON_EXPIRED'; end if;
  if v_order.coupon_id is not null then raise exception 'ORDER_ALREADY_HAS_COUPON'; end if;
  if exists(select 1 from public.ld_orders where user_id=p_user_id and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
  update public.ld_coupons set status='reserved',reserved_order_id=p_order_id,reserved_at=clock_timestamp() where id=v_coupon.id;
  -- No stacking: trusted checkout must choose the best promotion before reservation.
  update public.ld_orders set coupon_id=v_coupon.id,discount_cents=public.ld_coupon_discount(v_coupon,subtotal_cents) where id=p_order_id returning * into v_order;
  return jsonb_build_object('discount_cents',v_order.discount_cents,'expires_at',v_coupon.expires_at,'coupon_id',v_coupon.id);
end $$;

create or replace function public.ld_admin_redeem_coupon(p_code text,p_subtotal_cents integer,p_method text,p_reference text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_admin uuid:=auth.uid(); c public.ld_coupons; o public.ld_orders; v_time timestamptz; v_ref text:=nullif(trim(p_reference),'');
begin
  if not public.ld_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_request_id is null or p_subtotal_cents is null or p_subtotal_cents<=0 or p_subtotal_cents>100000000
    or p_method is null or p_method not in ('cash','transfer') or length(v_ref)>120 or p_code is null or length(trim(p_code))>64 then raise exception 'INVALID_SALE'; end if;
  select * into c from public.ld_coupons where code=upper(trim(p_code));
  if c.id is null then raise exception 'COUPON_NOT_FOUND'; end if;
  -- Same lock order as the original coupon/order functions. The account lock
  -- serializes competing offline redemptions and online reservations, if added.
  insert into public.ld_accounts(user_id) values(c.user_id) on conflict do nothing;
  perform 1 from public.ld_accounts where user_id=c.user_id for update;
  select * into o from public.ld_orders where id=p_request_id for update;
  select * into c from public.ld_coupons where id=c.id for update;
  if o.id is not null then
    if o.recorded_by is distinct from v_admin or o.coupon_id is distinct from c.id or o.subtotal_cents<>p_subtotal_cents
      or o.manual_method is distinct from p_method or o.sale_reference is distinct from v_ref or o.status<>'paid' then raise exception 'REQUEST_CONFLICT'; end if;
    return public.ld_admin_lookup_coupon(c.code);
  end if;
  v_time:=clock_timestamp();
  if c.status='used' then raise exception 'COUPON_ALREADY_USED'; end if;
  if c.status<>'available' then raise exception 'COUPON_UNAVAILABLE'; end if;
  if c.expires_at<=v_time then raise exception 'COUPON_EXPIRED'; end if;
  if exists(select 1 from public.ld_orders where user_id=c.user_id and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
  insert into public.ld_orders(id,user_id,subtotal_cents,discount_cents,coupon_id,status,provider_payment_id,paid_at,manual_method,recorded_by,sale_reference)
    values(p_request_id,c.user_id,p_subtotal_cents,public.ld_coupon_discount(c,p_subtotal_cents),c.id,'paid','manual:'||p_request_id::text,v_time,p_method,v_admin,v_ref);
  update public.ld_coupons set status='used',reserved_order_id=p_request_id,reserved_at=v_time,redeemed_at=v_time where id=c.id;
  return public.ld_admin_lookup_coupon(c.code);
end $$;
commit;

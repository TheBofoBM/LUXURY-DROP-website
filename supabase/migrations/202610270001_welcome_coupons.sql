-- Run once in a new Supabase project. All amounts are integer MXN cents.
begin;

create table public.ld_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.ld_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null default 'welcome-v1' check (campaign = 'welcome-v1'),
  code text not null unique,
  amount_cents integer not null check (amount_cents in (5000,10000,15000,20000,30000,40000)),
  status text not null default 'available' check (status in ('available','reserved','used','voided')),
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  reserved_order_id uuid,
  reserved_at timestamptz,
  redeemed_at timestamptz,
  unique (user_id,campaign),
  check (expires_at = issued_at + interval '24 hours'),
  check ((status in ('reserved','used')) = (reserved_order_id is not null)),
  check ((status = 'used') = (redeemed_at is not null))
);
-- Only a trusted checkout/payment backend can create or change orders.
create table public.ld_orders (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subtotal_cents integer not null check (subtotal_cents > 0),
  discount_cents integer not null default 0 check (discount_cents >= 0 and discount_cents <= subtotal_cents),
  coupon_id uuid references public.ld_coupons(id),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  provider_payment_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  check ((status = 'paid') = (paid_at is not null)),
  check ((status = 'paid') = (provider_payment_id is not null))
);
alter table public.ld_coupons add constraint ld_coupon_order_fk foreign key (reserved_order_id) references public.ld_orders(id);
create index ld_orders_user_status on public.ld_orders(user_id,status);

alter table public.ld_accounts enable row level security;
alter table public.ld_coupons enable row level security;
alter table public.ld_orders enable row level security;
revoke all on public.ld_accounts, public.ld_coupons, public.ld_orders from public, anon, authenticated;
grant select on public.ld_coupons, public.ld_orders to authenticated;
grant all on public.ld_accounts, public.ld_coupons, public.ld_orders to service_role;
create policy ld_own_coupons on public.ld_coupons for select to authenticated using ((select auth.uid()) = user_id);
create policy ld_own_orders on public.ld_orders for select to authenticated using ((select auth.uid()) = user_id);

create function public.ld_welcome_state() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_coupon public.ld_coupons; v_paid boolean;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_coupon from public.ld_coupons where user_id=v_user and campaign='welcome-v1';
  select exists(select 1 from public.ld_orders where user_id=v_user and status='paid') into v_paid;
  return jsonb_build_object('server_now',clock_timestamp(),'coupon',case when v_coupon.id is null then null else to_jsonb(v_coupon) end,'eligible',not v_paid and v_coupon.id is null);
end $$;

create function public.ld_claim_welcome() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_coupon public.ld_coupons; v_roll bigint; v_amount integer; v_now timestamptz;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null) then raise exception 'VERIFIED_EMAIL_REQUIRED'; end if;
  insert into public.ld_accounts(user_id) values(v_user) on conflict do nothing;
  perform 1 from public.ld_accounts where user_id=v_user for update;
  -- Unique lifetime grant per account/campaign; retries return the original coupon,
  -- even after use/expiry. Amount and code are never accepted from the browser.
  select * into v_coupon from public.ld_coupons where user_id=v_user and campaign='welcome-v1';
  if v_coupon.id is not null then return public.ld_welcome_state(); end if;
  if exists(select 1 from public.ld_orders where user_id=v_user and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
  v_roll := (('x'||substr(replace(gen_random_uuid()::text,'-',''),1,8))::bit(32)::bigint) % 10000;
  v_amount := case when v_roll<3500 then 5000 when v_roll<6500 then 10000 when v_roll<8500 then 15000 when v_roll<9500 then 20000 when v_roll<9900 then 30000 else 40000 end;
  v_now := clock_timestamp();
  insert into public.ld_coupons(user_id,code,amount_cents,issued_at,expires_at)
  values(v_user,'LD-'||upper(replace(gen_random_uuid()::text,'-','')),v_amount,v_now,v_now+interval '24 hours');
  return public.ld_welcome_state();
end $$;

-- Trusted backend only. Create ld_orders from server-priced inventory first.
-- All coupon/payment functions lock account -> order -> coupon in that order.
create function public.ld_reserve_coupon(p_user_id uuid,p_order_id uuid,p_code text) returns jsonb
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
  update public.ld_orders set coupon_id=v_coupon.id,discount_cents=least(v_coupon.amount_cents,subtotal_cents) where id=p_order_id returning * into v_order;
  return jsonb_build_object('discount_cents',v_order.discount_cents,'expires_at',v_coupon.expires_at,'coupon_id',v_coupon.id);
end $$;

-- Call only after cancelling the provider payment session and confirming it can
-- no longer charge. Never release a reservation solely on a browser timeout.
create function public.ld_cancel_order(p_user_id uuid,p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.ld_orders;
begin
  perform 1 from public.ld_accounts where user_id=p_user_id for update;
  select * into v_order from public.ld_orders where id=p_order_id and user_id=p_user_id for update;
  if v_order.id is null then raise exception 'INVALID_ORDER'; end if;
  if v_order.status='paid' then raise exception 'ORDER_ALREADY_PAID'; end if;
  if v_order.status='cancelled' then return; end if;
  if v_order.coupon_id is not null then
    perform 1 from public.ld_coupons where id=v_order.coupon_id for update;
    update public.ld_coupons set status='available',reserved_order_id=null,reserved_at=null where id=v_order.coupon_id and status='reserved' and reserved_order_id=p_order_id;
  end if;
  update public.ld_orders set status='cancelled',coupon_id=null,discount_cents=0 where id=p_order_id;
end $$;

-- Payment webhook only: verify signature, provider amount/currency/order and
-- payment timestamp before calling. Idempotent on the same order/payment ID.
create function public.ld_complete_order(p_user_id uuid,p_order_id uuid,p_payment_id text,p_paid_at timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.ld_orders; v_coupon public.ld_coupons;
begin
  if p_paid_at is null or p_payment_id is null or length(trim(p_payment_id))=0 or p_paid_at>clock_timestamp() then raise exception 'INVALID_PAYMENT'; end if;
  insert into public.ld_accounts(user_id) values(p_user_id) on conflict do nothing;
  perform 1 from public.ld_accounts where user_id=p_user_id for update;
  select * into v_order from public.ld_orders where id=p_order_id and user_id=p_user_id for update;
  if v_order.id is null then raise exception 'INVALID_ORDER'; end if;
  if v_order.status='paid' and v_order.provider_payment_id=p_payment_id then return; end if;
  if v_order.status<>'pending' or p_paid_at<v_order.created_at then raise exception 'INVALID_ORDER'; end if;
  if v_order.coupon_id is not null then
    select * into v_coupon from public.ld_coupons where id=v_order.coupon_id for update;
    if v_coupon.status<>'reserved' or v_coupon.reserved_order_id<>p_order_id or p_paid_at<v_coupon.reserved_at then raise exception 'COUPON_UNAVAILABLE'; end if;
    if p_paid_at>=v_coupon.expires_at then raise exception 'COUPON_EXPIRED'; end if;
    if exists(select 1 from public.ld_orders where user_id=p_user_id and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
    update public.ld_coupons set status='used',redeemed_at=p_paid_at where id=v_coupon.id;
  end if;
  update public.ld_orders set status='paid',provider_payment_id=p_payment_id,paid_at=p_paid_at where id=p_order_id;
  -- Paying a different first order also ends welcome eligibility. Pending
  -- discounted sessions must be cancelled by checkout before taking this payment.
  update public.ld_coupons set status='voided',reserved_order_id=null,reserved_at=null
    where user_id=p_user_id and status in ('available','reserved') and (id is distinct from v_order.coupon_id);
end $$;

revoke all on function public.ld_welcome_state(),public.ld_claim_welcome(),public.ld_reserve_coupon(uuid,uuid,text),public.ld_cancel_order(uuid,uuid),public.ld_complete_order(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.ld_welcome_state(),public.ld_claim_welcome() to authenticated;
grant execute on function public.ld_reserve_coupon(uuid,uuid,text),public.ld_cancel_order(uuid,uuid),public.ld_complete_order(uuid,uuid,text,timestamptz) to service_role;
commit;

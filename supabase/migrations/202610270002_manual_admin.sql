-- Apply after 202610270001. Records offline sales; never moves money.
begin;
create table public.ld_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.ld_admins enable row level security;
revoke all on public.ld_admins from public,anon,authenticated;
grant all on public.ld_admins to service_role;

alter table public.ld_orders add column manual_method text check (manual_method in ('cash','transfer'));
alter table public.ld_orders add column recorded_by uuid references auth.users(id);
alter table public.ld_orders add column sale_reference text check (length(sale_reference)<=120);
alter table public.ld_orders add constraint ld_manual_sale_actor check ((manual_method is null)=(recorded_by is null));

create function public.ld_is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.ld_admins where user_id=(select auth.uid()));
$$;

create function public.ld_admin_lookup_coupon(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.ld_coupons; v_status text; v_email text; v_sale jsonb;
begin
  if not public.ld_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if length(trim(p_code))>64 then raise exception 'INVALID_CODE'; end if;
  select * into c from public.ld_coupons where code=upper(trim(p_code));
  if c.id is null then return jsonb_build_object('found',false,'server_now',clock_timestamp()); end if;
  v_status:=c.status;
  if c.status='available' and c.expires_at<=clock_timestamp() then v_status:='expired'; end if;
  if v_status='available' and exists(select 1 from public.ld_orders where user_id=c.user_id and status='paid') then v_status:='ineligible'; end if;
  select email into v_email from auth.users where id=c.user_id;
  select jsonb_build_object('id',o.id,'subtotal_cents',o.subtotal_cents,'discount_cents',o.discount_cents,'collected_cents',o.subtotal_cents-o.discount_cents,'method',o.manual_method,'reference',o.sale_reference,'recorded_at',o.paid_at,'recorded_by',u.email)
    into v_sale from public.ld_orders o left join auth.users u on u.id=o.recorded_by
    where o.id=c.reserved_order_id and o.status='paid';
  return jsonb_build_object('found',true,'server_now',clock_timestamp(),'coupon',to_jsonb(c),'customer_email',v_email,'status',v_status,'can_redeem',v_status='available','sale',v_sale);
end $$;

create function public.ld_admin_recent_sales() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sales jsonb;
begin
  if not public.ld_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(s) order by s.recorded_at desc),'[]'::jsonb) into v_sales from (
    select o.id,c.code,u.email as customer_email,o.subtotal_cents,o.discount_cents,
      o.subtotal_cents-o.discount_cents as collected_cents,o.manual_method as method,
      o.sale_reference as reference,o.paid_at as recorded_at,a.email as recorded_by
    from public.ld_orders o join public.ld_coupons c on c.id=o.coupon_id
    join auth.users u on u.id=o.user_id left join auth.users a on a.id=o.recorded_by
    where o.manual_method is not null and o.status='paid' order by o.paid_at desc limit 20
  ) s;
  return jsonb_build_object('sales',v_sales,'server_now',clock_timestamp());
end $$;

create function public.ld_admin_redeem_coupon(p_code text,p_subtotal_cents integer,p_method text,p_reference text,p_request_id uuid) returns jsonb
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
    values(p_request_id,c.user_id,p_subtotal_cents,least(c.amount_cents,p_subtotal_cents),c.id,'paid','manual:'||p_request_id::text,v_time,p_method,v_admin,v_ref);
  update public.ld_coupons set status='used',reserved_order_id=p_request_id,reserved_at=v_time,redeemed_at=v_time where id=c.id;
  return public.ld_admin_lookup_coupon(c.code);
end $$;

revoke all on function public.ld_is_admin(),public.ld_admin_lookup_coupon(text),public.ld_admin_recent_sales(),public.ld_admin_redeem_coupon(text,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function public.ld_is_admin(),public.ld_admin_lookup_coupon(text),public.ld_admin_recent_sales(),public.ld_admin_redeem_coupon(text,integer,text,text,uuid) to authenticated;
commit;

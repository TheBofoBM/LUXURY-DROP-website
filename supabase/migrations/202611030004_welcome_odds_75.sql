-- Apply after 202610300003. Changes future draws only; no coupon is rerolled.
begin;
create or replace function public.ld_welcome_percent(p_roll integer) returns integer
language sql immutable strict set search_path='' as $$
  select case when p_roll between 0 and 199 then 5
    when p_roll between 200 and 499 then 10
    when p_roll between 500 and 999 then 15
    when p_roll between 1000 and 2499 then 20
    when p_roll between 2500 and 9999 then 25 end;
$$;
-- CREATE OR REPLACE preserves the existing private execution grants.
commit;

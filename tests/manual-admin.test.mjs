import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('private administrator validation and atomic offline redemption',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;`);
  for(const file of ['202610270001_welcome_coupons.sql','202610270002_manual_admin.sql','202610300003_percentage_welcome.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  const [admin,admin2,client,expiredClient,reservedClient,smallClient]=[1,2,3,4,5,6].map(n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  for(const id of [admin,admin2,client,expiredClient,reservedClient,smallClient])await db.query('insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())',[id,id.slice(-1)+'@example.test']);
  await db.query('insert into public.ld_admins(user_id) values($1),($2)',[admin,admin2]);
  const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  const claim=async id=>{await asUser(id);return (await db.query('select public.ld_claim_welcome() as data')).rows[0].data.coupon;};
  const coupon=await claim(client),expired=await claim(expiredClient),reserved=await claim(reservedClient),small=await claim(smallClient);
  const lookup=async code=>(await db.query('select public.ld_admin_lookup_coupon($1) as data',[code])).rows[0].data;
  const request='30000000-0000-4000-8000-000000000001';
  const redeem=(who,code,total,method,ref,id)=>db.query('select public.ld_admin_redeem_coupon($1,$2,$3,$4,$5) as data',[code,total,method,ref,id]);
  await t.test('customer metadata cannot grant administrator privileges or expose customer codes',async()=>{
   await db.exec('reset role');await db.query('update auth.users set raw_user_meta_data=$1::jsonb where id=$2',[JSON.stringify({role:'admin',is_admin:true}),client]);
   await asUser(client);assert.equal((await db.query('select public.ld_is_admin() as allowed')).rows[0].allowed,false);
   await assert.rejects(lookup(coupon.code),/ADMIN_REQUIRED/);
   await assert.rejects(db.query('select public.ld_admin_recent_sales()'),/ADMIN_REQUIRED/);
   await assert.rejects(redeem(client,coupon.code,90000,'cash',null,request),/ADMIN_REQUIRED/);
   await assert.rejects(db.query('insert into public.ld_admins(user_id) values($1)',[client]),/permission denied/);
   assert.equal((await db.query("select has_function_privilege('anon','public.ld_admin_lookup_coupon(text)','execute') as allowed")).rows[0].allowed,false);
  });
  await t.test('administrator gets authoritative amount, owner, expiry and unknown-code result',async()=>{
   await asUser(admin);assert.equal((await db.query('select public.ld_is_admin() as allowed')).rows[0].allowed,true);
   const result=await lookup(coupon.code.toLowerCase());assert.equal(result.can_redeem,true);assert.equal(result.customer_email,'3@example.test');assert.equal(result.coupon.discount_percent,coupon.discount_percent);
   assert.equal((await lookup('LD-NO-EXISTE')).found,false);
  });
  await t.test('manual cash sale redeems once and an identical retry is idempotent',async()=>{
   const result=(await redeem(admin,coupon.code,90000,'cash','VENTA-001',request)).rows[0].data;
   assert.equal(result.status,'used');assert.equal(result.sale.method,'cash');assert.equal(result.sale.collected_cents,90000-900*coupon.discount_percent);
   const retry=(await redeem(admin,coupon.code,90000,'cash','VENTA-001',request)).rows[0].data;assert.equal(retry.sale.id,result.sale.id);
   await assert.rejects(redeem(admin,coupon.code,95000,'cash','VENTA-001',request),/REQUEST_CONFLICT/);
   await assert.rejects(redeem(admin,coupon.code,90000,'cash',null,'30000000-0000-4000-8000-000000000002'),/COUPON_ALREADY_USED/);
  });
  await t.test('a second administrator cannot redeem the same coupon; customer sees used',async()=>{
   await asUser(admin2);await assert.rejects(redeem(admin2,coupon.code,90000,'transfer',null,'30000000-0000-4000-8000-000000000003'),/COUPON_ALREADY_USED/);
   await asUser(client);assert.equal((await db.query('select public.ld_welcome_state() as data')).rows[0].data.coupon.status,'used');
   assert.equal((await db.query('select count(*)::int as n from public.ld_orders')).rows[0].n,1);
  });
  await t.test('expired or reserved coupons cannot be manually redeemed',async()=>{
   await db.exec('reset role');await db.query("update public.ld_coupons set issued_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=$1",[expired.id]);
   const order='30000000-0000-4000-8000-000000000004';await db.query('insert into public.ld_orders(id,user_id,subtotal_cents) values($1,$2,100000)',[order,reservedClient]);await db.query('select public.ld_reserve_coupon($1,$2,$3)',[reservedClient,order,reserved.code]);
   await asUser(admin);assert.equal((await lookup(expired.code)).status,'expired');assert.equal((await lookup(reserved.code)).status,'reserved');
   await assert.rejects(redeem(admin,expired.code,80000,'cash',null,'30000000-0000-4000-8000-000000000005'),/COUPON_EXPIRED/);
   await assert.rejects(redeem(admin,reserved.code,80000,'cash',null,'30000000-0000-4000-8000-000000000006'),/COUPON_UNAVAILABLE/);
  });
  await t.test('transfer sale applies percentage to a small subtotal and is included in private audit history',async()=>{
   await assert.rejects(redeem(admin,small.code,0,'cash',null,'30000000-0000-4000-8000-000000000007'),/INVALID_SALE/);
   const result=(await redeem(admin,small.code,1000,'transfer','VENTA-002','30000000-0000-4000-8000-000000000008')).rows[0].data;
   assert.equal(result.sale.discount_cents,10*small.discount_percent);assert.equal(result.sale.collected_cents,1000-10*small.discount_percent);
   const list=(await db.query('select public.ld_admin_recent_sales() as data')).rows[0].data.sales;assert.equal(list.length,2);assert(list.some(s=>s.reference==='VENTA-002'&&s.recorded_by==='1@example.test'));
  });
 }finally{await db.close();}
});

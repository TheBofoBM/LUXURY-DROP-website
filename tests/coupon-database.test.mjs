import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

// Runs the actual PostgreSQL migration. auth.* stubs emulate Supabase's identity
// helpers; these tests do not claim to exercise hosted OAuth or network races.
test('PostgreSQL coupon issuance, isolation, reservation and payment rules',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon;
    grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(await readFile(new URL('../supabase/migrations/202610270001_welcome_coupons.sql',import.meta.url),'utf8'));
  const ids=[1,2,3,4].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  for(const id of ids)await db.query('insert into auth.users values($1,now())',[id]);
  const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  const admin=()=>db.exec('reset role');
  const claim=async()=> (await db.query('select public.ld_claim_welcome() as data')).rows[0].data;
  let coupon;
  await t.test('repeated issue requests return one immutable code and exact 24-hour lifetime',async()=>{
   await asUser(ids[0]);const attempts=await Promise.all(Array.from({length:8},claim));coupon=attempts[0].coupon;
   assert(attempts.every(r=>r.coupon.id===coupon.id&&r.coupon.code===coupon.code&&r.coupon.expires_at===coupon.expires_at));
   assert.equal(Date.parse(coupon.expires_at)-Date.parse(coupon.issued_at),86400000);
   assert.match(coupon.code,/^LD-[A-F0-9]{32}$/);
   assert(coupon.amount_cents>=5000&&coupon.amount_cents<=40000);
   assert.equal((await db.query('select count(*)::int as n from public.ld_coupons')).rows[0].n,1);
  });
  await t.test('browser cannot forge coupons, see another account or reserve/redeem',async()=>{
   await asUser(ids[1]);assert.equal((await db.query('select * from public.ld_coupons')).rows.length,0);
   await assert.rejects(db.query("insert into public.ld_coupons default values"),/permission denied/);
   const grants=await db.query("select has_function_privilege('authenticated','public.ld_reserve_coupon(uuid,uuid,text)','execute') as reserve,has_function_privilege('authenticated','public.ld_complete_order(uuid,uuid,text,timestamptz)','execute') as redeem,has_function_privilege('anon','public.ld_claim_welcome()','execute') as anonymous");
   assert.deepEqual(grants.rows[0],{reserve:false,redeem:false,anonymous:false});
  });
  const order1='10000000-0000-4000-8000-000000000001',order2='10000000-0000-4000-8000-000000000002';
  await t.test('one coupon can be reserved by only one order; retries do not extend expiry',async()=>{
   await admin();await db.query('insert into public.ld_orders(id,user_id,subtotal_cents) values($1,$3,1000),($2,$3,90000)',[order1,order2,ids[0]]);
   const r=await db.query('select public.ld_reserve_coupon($1,$2,$3) as data',[ids[0],order1,coupon.code]);assert.equal(r.rows[0].data.discount_cents,1000);
   const again=await db.query('select public.ld_reserve_coupon($1,$2,$3) as data',[ids[0],order1,coupon.code]);assert.equal(again.rows[0].data.expires_at,coupon.expires_at);
   await assert.rejects(db.query('select public.ld_reserve_coupon($1,$2,$3)',[ids[0],order2,coupon.code]),/COUPON_UNAVAILABLE/);
   await assert.rejects(db.query('select public.ld_reserve_coupon($1,$2,$3)',[ids[1],order2,coupon.code]),/INVALID_ORDER/);
  });
  await t.test('provider-confirmed cancellation releases; payment redeems exactly once',async()=>{
   await db.query('select public.ld_cancel_order($1,$2)',[ids[0],order1]);
   await db.query('select public.ld_reserve_coupon($1,$2,$3)',[ids[0],order2,coupon.code]);
   await db.query("select public.ld_complete_order($1,$2,'provider-001',clock_timestamp())",[ids[0],order2]);
   await db.query("select public.ld_complete_order($1,$2,'provider-001',clock_timestamp())",[ids[0],order2]);
   const row=(await db.query('select status,redeemed_at,reserved_order_id from public.ld_coupons where id=$1',[coupon.id])).rows[0];assert.equal(row.status,'used');assert.equal(row.reserved_order_id,order2);assert(row.redeemed_at);
   await asUser(ids[0]);assert.equal((await claim()).coupon.id,coupon.id);
  });
  await t.test('expiry is enforced on the server and cannot be reset by claiming again',async()=>{
   await asUser(ids[1]);const c=(await claim()).coupon;await admin();
   await db.query("update public.ld_coupons set issued_at=now()-interval '25 hours',expires_at=now()-interval '1 hour' where id=$1",[c.id]);
   const order='10000000-0000-4000-8000-000000000003';await db.query('insert into public.ld_orders(id,user_id,subtotal_cents) values($1,$2,50000)',[order,ids[1]]);
   await assert.rejects(db.query('select public.ld_reserve_coupon($1,$2,$3)',[ids[1],order,c.code]),/COUPON_EXPIRED/);
   await asUser(ids[1]);const retry=await claim();assert.equal(retry.coupon.id,c.id);assert(Date.parse(retry.coupon.expires_at)<Date.now());assert.equal(retry.eligible,false);
  });
  await t.test('a paid first order makes an account ineligible; unverified accounts cannot spin',async()=>{
   await admin();const order='10000000-0000-4000-8000-000000000004';await db.query('insert into public.ld_orders(id,user_id,subtotal_cents) values($1,$2,50000)',[order,ids[2]]);
   await db.query("select public.ld_complete_order($1,$2,'provider-002',clock_timestamp())",[ids[2],order]);
   await asUser(ids[2]);await assert.rejects(claim(),/FIRST_PURCHASE_ONLY/);
   await admin();await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids[3]]);await asUser(ids[3]);await assert.rejects(claim(),/VERIFIED_EMAIL_REQUIRED/);
  });
 }finally{await db.close();}
});

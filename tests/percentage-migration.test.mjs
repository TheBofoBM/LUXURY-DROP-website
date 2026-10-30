import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {choosePrize,couponDiscountCents,welcomePrizes,welcomeWeights} from '../dist/welcome-model.js';

test('percentage migration preserves issued coupons and enforces server percentage calculations',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`create role anon; create role authenticated; create role service_role;
   create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth to anon,authenticated;
   grant execute on function auth.uid() to anon,authenticated;`);
  const migrate=async file=>db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
  await migrate('202610270001_welcome_coupons.sql');await migrate('202610270002_manual_admin.sql');
  const [owner,fixedUser,usedUser,newUser]=[1,2,3,4].map(n=>`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`);
  for(const id of [owner,fixedUser,usedUser,newUser])await db.query('insert into auth.users values($1,$2,now())',[id,id+'@example.test']);
  await db.query('insert into public.ld_admins(user_id) values($1)',[owner]);
  const asUser=async id=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
  const claim=async id=>{await asUser(id);return (await db.query('select public.ld_claim_welcome() as data')).rows[0].data.coupon;};
  const fixed=await claim(fixedUser),used=await claim(usedUser);
  await asUser(owner);
  await db.query('select public.ld_admin_redeem_coupon($1,160000,\'cash\',null,$2)',[used.code,'50000000-0000-4000-8000-000000000001']);
  await db.exec('reset role');await db.query('update public.ld_coupons set amount_cents=40000 where id=$1',[fixed.id]);
  const before=(await db.query('select * from public.ld_coupons order by id')).rows;
  await migrate('202610300003_percentage_welcome.sql');

  await t.test('forward migration keeps every old code, amount, expiry and redemption; no new spin',async()=>{
   const after=(await db.query('select * from public.ld_coupons order by id')).rows;
   assert.deepEqual(after.map(({discount_percent,...c})=>c),before);
   assert(after.every(c=>c.discount_percent===null));
   for(const [id,c] of [[fixedUser,fixed],[usedUser,used]]){
    const retry=await claim(id);assert.equal(retry.id,c.id);assert.equal(retry.expires_at,c.expires_at);assert.equal(retry.discount_percent,null);
   }
  });
  await t.test('server and wheel agree on every probability bucket, including 45% maximum',async()=>{
   await db.exec('reset role');
   const rows=(await db.query('select roll,public.ld_welcome_percent(roll) as prize from generate_series(0,9999) roll')).rows;
   const counts=welcomePrizes.map(()=>0);
   for(const r of rows){assert.equal(r.prize,choosePrize(r.roll/10000));counts[welcomePrizes.indexOf(r.prize)]++;}
   assert.deepEqual(counts,welcomeWeights.map(w=>w*100));
  });
  const percent=await claim(newUser);
  await t.test('new issues contain a percentage only and a retry cannot reroll it',async()=>{
   assert.equal(percent.amount_cents,null);assert(welcomePrizes.includes(percent.discount_percent));
   const again=await claim(newUser);assert.deepEqual(again,percent);
   assert.equal(Date.parse(percent.expires_at)-Date.parse(percent.issued_at),86400000);
  });
  await t.test('constraints and permissions prevent forging rates, mixing types or exposing helpers',async()=>{
   await db.exec('reset role');
   await assert.rejects(db.query('update public.ld_coupons set discount_percent=100 where id=$1',[percent.id]),/check constraint/);
   await assert.rejects(db.query('update public.ld_coupons set amount_cents=40000 where id=$1',[percent.id]),/check constraint/);
   await assert.rejects(db.query('update public.ld_coupons set discount_percent=null where id=$1',[percent.id]),/check constraint/);
   await asUser(newUser);
   await assert.rejects(db.query('update public.ld_coupons set discount_percent=25 where id=$1',[percent.id]),/permission denied/);
   await assert.rejects(db.query('select public.ld_welcome_percent(9999)'),/permission denied/);
   await assert.rejects(db.query('select public.ld_coupon_discount(c,320000) from public.ld_coupons c'),/permission denied/);
  });
  await t.test('PostgreSQL and browser round identical cents across all rates and small/large totals',async()=>{
   await db.exec('reset role');
   for(const rate of welcomePrizes){
    await db.query('update public.ld_coupons set discount_percent=$1 where id=$2',[rate,percent.id]);
    const rows=(await db.query('select n,public.ld_coupon_discount(c,n) as discount from public.ld_coupons c cross join unnest(array[1,2,3,9,10,99,44900,89900,160000,320000,100000000]) n where c.id=$1',[percent.id])).rows;
    for(const r of rows)assert.equal(r.discount,couponDiscountCents(r.n,{discount_percent:rate}));
   }
  });
  await t.test('25% on two $1600 garments saves $800, stores once, and retries preserve the sale',async()=>{
   await db.exec('reset role');await db.query('update public.ld_coupons set discount_percent=25 where id=$1',[percent.id]);
   await asUser(owner);const args=[percent.code,'50000000-0000-4000-8000-000000000002'];
   const redeem=()=>db.query("select public.ld_admin_redeem_coupon($1,320000,'transfer',null,$2) as data",args);
   const first=(await redeem()).rows[0].data;
   assert.equal(first.sale.discount_cents,80000);assert.equal(first.sale.collected_cents,240000);
   assert.deepEqual((await redeem()).rows[0].data.sale,first.sale);
   await assert.rejects(db.query("select public.ld_admin_redeem_coupon($1,320000,'cash',null,$2)",[percent.code,'50000000-0000-4000-8000-000000000003']),/COUPON_ALREADY_USED/);
  });
  await t.test('legacy fixed coupon still discounts exactly $400 on a $3200 first purchase',async()=>{
   await asUser(owner);
   const result=(await db.query("select public.ld_admin_redeem_coupon($1,320000,'cash',null,$2) as data",[fixed.code,'50000000-0000-4000-8000-000000000004'])).rows[0].data;
   assert.equal(result.sale.discount_cents,40000);assert.equal(result.sale.collected_cents,280000);
  });
 }finally{await db.close();}
});

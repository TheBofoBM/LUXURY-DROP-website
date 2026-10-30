import {test} from 'node:test';
import assert from 'node:assert/strict';
import {couponStatus,countdown,welcomeDiscount,choosePrize,welcomeWeights,welcomePrizes,couponDiscountCents,couponLabel} from '../dist/welcome-model.js';
test('24-hour boundary, reserved/used states and non-negative totals',()=>{
 const issued=Date.parse('2026-10-27T12:00:00Z');const coupon={expires_at:'2026-10-28T12:00:00Z',amount_cents:40000,status:'available'};
 assert.equal(countdown(coupon.expires_at,issued),'24:00:00');
 assert.equal(couponStatus(coupon,issued+86400000-1),'available');
 assert.equal(couponStatus(coupon,issued+86400000),'expired');
 assert.equal(welcomeDiscount(150,coupon,issued),150);
 assert.equal(welcomeDiscount(800,coupon,issued),400);
 assert.equal(welcomeDiscount(800,coupon,issued+86400000),0);
 for(const status of ['used','reserved','voided'])assert.equal(welcomeDiscount(800,{...coupon,status},issued),0);
});
test('largest percentage is the most likely prize, with disclosed exact distribution',()=>{
 assert.equal(welcomeWeights.reduce((a,b)=>a+b,0),100);
 const counts=new Map(welcomePrizes.map(p=>[p,0]));
 for(let i=0;i<10000;i++)counts.set(choosePrize(i/10000),counts.get(choosePrize(i/10000))+1);
 assert.deepEqual([...counts.values()],[500,1000,1500,2500,4500]);
 assert.equal(choosePrize(.55),25);assert.equal(choosePrize(.99999),25);
});

test('25% scales with all garments, has no $400 cap, and rounds to cents once',()=>{
 const now=Date.parse('2026-10-27T12:00:00Z');
 const c={discount_percent:25,amount_cents:null,status:'available',expires_at:'2026-10-28T12:00:00Z'};
 assert.equal(welcomeDiscount(1600,c,now),400);
 assert.equal(welcomeDiscount(3200,c,now),800);
 assert.equal(welcomeDiscount(10000,c,now),2500);
 assert.equal(welcomeDiscount(899,c,now),224.75);
 assert.equal(couponDiscountCents(2,c),1);
 assert.equal(couponDiscountCents(0,c),0);
 assert.equal(welcomeDiscount(3200,{...c,status:'used'},now),0);
 assert.equal(welcomeDiscount(3200,c,now+86400000),0);
 assert.equal(couponLabel(c),'25%');
});

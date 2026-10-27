import {test} from 'node:test';
import assert from 'node:assert/strict';
import {couponStatus,countdown,welcomeDiscount,choosePrize,welcomeWeights} from '../dist/welcome-model.js';
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
test('proposed prize distribution includes an attainable $400 maximum',()=>{
 assert.equal(welcomeWeights.reduce((a,b)=>a+b,0),100);
 assert.equal(choosePrize(0),50);assert.equal(choosePrize(.349),50);assert.equal(choosePrize(.35),100);assert.equal(choosePrize(.9899),300);assert.equal(choosePrize(.99),400);
});

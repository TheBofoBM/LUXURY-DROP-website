import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,sanitizeCart} from '../dist/catalog.js';
test('discount tiers, spin eligibility and reversal when removing products',()=>{
 assert.deepEqual(totals([]),{subtotal:0,rate:0,discount:0,total:0,spinEligible:false});
 const low=totals([{id:'jacket',qty:1}]);assert.equal(low.rate,.05);assert.equal(low.discount,64.95);assert.equal(low.spinEligible,false);
 const eligible=totals([{id:'hoodie',qty:1},{id:'denim',qty:1}]);assert.equal(eligible.subtotal,1648);assert.equal(eligible.spinEligible,true);assert.equal(eligible.total,1565.6);
 const high=totals([{id:'jacket',qty:1},{id:'hoodie',qty:1}]);assert.equal(high.rate,.1);assert.equal(high.total,1978.2);
 const removed=totals([{id:'hoodie',qty:1}]);assert.equal(removed.rate,0);assert.equal(removed.spinEligible,false);
});
test('untrusted stored carts cannot exceed inventory across sizes or carry invalid lines',()=>{
 const cart=sanitizeCart([{id:'jacket',size:'M',qty:2},{id:'jacket',size:'S',qty:9},{id:'tee',size:'XXL',qty:1},{id:'tee',size:'M',qty:-1},{id:'other',size:'S',qty:1}]);
 assert.deepEqual(cart,[{id:'jacket',size:'M',qty:2},{id:'jacket',size:'S',qty:1}]);
 assert.deepEqual(sanitizeCart({}),[]);
});

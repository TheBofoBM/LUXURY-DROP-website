import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,sanitizeCart} from '../dist/catalog.js';
test('discount tiers and reversal when removing products',()=>{
 assert.deepEqual(totals([]),{subtotal:0,promotionSubtotal:0,rate:0,discount:0,total:0});
 const low=totals([{id:'boss-navy',qty:1}]);assert.equal(low.rate,.05);assert.equal(low.discount,74.95);
 const eligible=totals([{id:'hugo-black',qty:1},{id:'lacoste-green',qty:1}]);assert.equal(eligible.subtotal,2998);assert.equal(eligible.total,2698.2);
 const high=totals([{id:'boss-navy',qty:1},{id:'hugo-black',qty:1},{id:'lacoste-green',qty:1}]);assert.equal(high.rate,.1);assert.equal(high.total,4047.3);
 const removed=totals([{id:'hugo-black',qty:1}]);assert.equal(removed.rate,.05);
});
test('untrusted stored carts cannot exceed inventory across sizes or carry invalid lines',()=>{
 const cart=sanitizeCart([{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:9},{id:'hugo-black',size:'XL',qty:1},{id:'lacoste-green',size:'M',qty:-1},{id:'tee',size:'M',qty:1},{id:'jacket',size:'M',qty:1}]);
 assert.deepEqual(cart,[{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:1}]);
 assert.deepEqual(sanitizeCart({}),[]);
});

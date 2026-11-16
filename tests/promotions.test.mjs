import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,sanitizeCart,products,salePrice} from '../dist/catalog.js';
test('Black Friday charges exactly 650 per garment regardless of model, quantity or former tier boundaries',()=>{
 assert.deepEqual(totals([]),{subtotal:0,promotionSubtotal:0,discount:0,total:0});
 assert.deepEqual(products.map(p=>p.id),['boss-navy','hugo-black','lacoste-green']);
 for(const product of products){
  assert.equal(product.price,1499);assert.equal(salePrice(product),650);
  for(let qty=1;qty<=5;qty++){
   const t=totals([{id:product.id,qty}]);assert.equal(t.subtotal,1499*qty);assert.equal(t.discount,849*qty);assert.equal(t.total,650*qty);
  }
 }
 const three=totals(products.map(p=>({id:p.id,qty:1})));assert.equal(three.total,1950);assert.equal(three.discount,2547);
 const two=totals([{id:'hugo-black',qty:1},{id:'lacoste-green',qty:1}]);assert.equal(two.total,1300);
 assert.equal(totals([{id:'hugo-black',qty:1}]).total,650);
});
test('untrusted stored carts cannot exceed inventory across sizes or carry invalid lines',()=>{
 const cart=sanitizeCart([{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:9},{id:'hugo-black',size:'XL',qty:1},{id:'lacoste-green',size:'M',qty:-1},{id:'tee',size:'M',qty:1},{id:'jacket',size:'M',qty:1},{id:'daily-pack',size:'S-M-L',qty:3}]);
 assert.deepEqual(cart,[{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:1}]);
 assert.deepEqual(sanitizeCart({}),[]);
});

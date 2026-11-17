import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totals,sanitizeCart,products,salePrice} from '../dist/catalog.js';
test('Black Friday charges exactly 650 per garment regardless of model, quantity or former tier boundaries',()=>{
 assert.deepEqual(totals([]),{subtotal:0,promotionSubtotal:0,discount:0,total:0});
 assert.deepEqual(products.filter(p=>p.category==='Playeras').map(p=>p.id),['boss-navy','hugo-black','lacoste-green']);
 for(const product of products.filter(p=>p.category==='Playeras')){
  assert.equal(product.price,1499);assert.equal(salePrice(product),650);
  for(let qty=1;qty<=5;qty++){
   const t=totals([{id:product.id,qty}]);assert.equal(t.subtotal,1499*qty);assert.equal(t.discount,849*qty);assert.equal(t.total,650*qty);
  }
 }
 const three=totals(products.filter(p=>p.category==='Playeras').map(p=>({id:p.id,qty:1})));assert.equal(three.total,1950);assert.equal(three.discount,2547);
 const two=totals([{id:'hugo-black',qty:1},{id:'lacoste-green',qty:1}]);assert.equal(two.total,1300);
 assert.equal(totals([{id:'hugo-black',qty:1}]).total,650);
});
test('untrusted stored carts cannot exceed inventory across sizes or carry invalid lines',()=>{
 const cart=sanitizeCart([{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:9},{id:'hugo-black',size:'XL',qty:1},{id:'lacoste-green',size:'M',qty:-1},{id:'tee',size:'M',qty:1},{id:'jacket',size:'M',qty:1},{id:'daily-pack',size:'S-M-L',qty:3}]);
 assert.deepEqual(cart,[{id:'boss-navy',size:'S',qty:2},{id:'boss-navy',size:'M',qty:2},{id:'boss-navy',size:'L',qty:1}]);
 assert.deepEqual(sanitizeCart({}),[]);
});

test('four caps cost 450 each and the white WES-TRN stays at 600 without a fake discount',()=>{
 const caps=products.filter(p=>p.category==='Gorras');assert.equal(caps.length,5);
 for(const cap of caps){
  assert.equal(cap.price,600);
  const white=cap.id==='cap-wes-trn-white';
  assert.equal(salePrice(cap),white?600:450);
  const order=totals([{id:cap.id,qty:2}]);assert.equal(order.total,white?1200:900);assert.equal(order.discount,white?0:300);
 }
 const all=totals(products.map(p=>({id:p.id,qty:1})));
 assert.equal(all.total,5750);assert.equal(all.discount,3947);assert.equal(all.subtotal,9697);
 assert.deepEqual(sanitizeCart([{id:'cap-wes-trn-white',size:'M',qty:1},{id:'cap-champion-black',size:'U',qty:1}]),[{id:'cap-champion-black',size:'U',qty:1}]);
});

test('all four sunglasses have three distinct views and cost 350 per pair, including mixed bags',()=>{
 const glasses=products.filter(p=>p.category==='Lentes de sol');assert.equal(glasses.length,4);
 for(const p of glasses){
  assert.equal(p.price,550);assert.equal(salePrice(p),350);
  assert.equal(p.images.length,3);assert.equal(new Set(p.images.map(view=>view.src)).size,3);assert.equal(p.image,p.images[0].src);
  assert.deepEqual(p.sizes,['U']);
  for(let qty=1;qty<=5;qty++){const t=totals([{id:p.id,qty}]);assert.equal(t.total,350*qty);assert.equal(t.discount,200*qty);}
  assert.deepEqual(sanitizeCart([{id:p.id,size:'M',qty:1},{id:p.id,size:'U',qty:9}]),[{id:p.id,size:'U',qty:5}]);
 }
 const mixed=totals([{id:'boss-navy',qty:1},{id:'cap-champion-black',qty:1},{id:glasses[0].id,qty:2}]);
 assert.equal(mixed.total,1800);assert.equal(mixed.discount,1399);
});

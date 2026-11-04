import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOrderRequest,whatsappLink} from '../dist/order-request.js';

const now=Date.parse('2026-11-03T18:00:00Z');
const coupon={id:'coupon-id',code:'LD-ABC123',discount_percent:25,amount_cents:null,status:'available',expires_at:'2026-11-04T18:00:00Z'};
const one=[{id:'boss-navy',size:'M',qty:1}];

test('WhatsApp inquiry includes actual garments, sizes and exact percentage totals without consuming a coupon',()=>{
 const before=structuredClone(coupon);
 const order=createOrderRequest([...one,{id:'hugo-black',size:'M',qty:1}],{coupon,now});
 assert.equal(order.subtotal,2998);assert.equal(order.discount,749.5);assert.equal(order.total,2248.5);
 assert.match(order.text,/Playera BOSS.*Talla M/);assert.match(order.text,/Playera HUGO.*Talla M/);
 assert.match(order.text,/LD-ABC123/);assert.match(order.text,/25%/);assert.match(order.text,/\$2,248\.50/);
 assert.match(order.text,/sigue sin canjearse/);assert.match(order.text,/Envío por confirmar/);
 assert.deepEqual(coupon,before);
 const single=createOrderRequest(one,{coupon,now});assert.equal(single.discount,374.75);assert.equal(single.total,1124.25);
});

test('expired, consumed, reserved and demonstration coupons are excluded; no promotion stacking',()=>{
 for(const c of [{...coupon,expires_at:new Date(now).toISOString()},...['used','reserved','voided'].map(status=>({...coupon,status})),{...coupon,preview:true},{...coupon,code:'LD-DEMO-123'}]){
  const order=createOrderRequest(one,{coupon:c,now});assert.equal(order.coupon,null);assert.equal(order.discount,74.95);assert.doesNotMatch(order.text,/Mi código de cupón/);
 }
 const order=createOrderRequest([...one,{id:'hugo-black',size:'M',qty:1}],{coupon:{...coupon,discount_percent:5},now});
 assert.equal(order.coupon,null);assert.equal(order.discount,299.8);assert.match(order.text,/Promoción por monto: 10%/);
});

test('order inquiry rejects an empty selection and removes old items, invalid sizes and excess stock',()=>{
 assert.throws(()=>createOrderRequest([]),/EMPTY_CART/);
 assert.throws(()=>createOrderRequest([{id:'jacket',size:'M',qty:1}]),/EMPTY_CART/);
 const order=createOrderRequest([...one,{id:'boss-navy',size:'M',qty:8},{id:'hugo-black',size:'L',qty:1}]);
 assert.deepEqual(order.lines,[{id:'boss-navy',size:'M',qty:5}]);assert.equal(order.subtotal,7495);assert.match(order.text,/Bajo pedido/);
});

test('legacy fixed coupons keep their amount and links encode accents, symbols and line breaks safely',()=>{
 const order=createOrderRequest(one,{coupon:{...coupon,discount_percent:null,amount_cents:40000},now});
 assert.equal(order.discount,400);assert.equal(order.total,1099);
 const text=order.text+'\nReferencia: algodón & talla + color #1';
 const link=new URL(whatsappLink('+52 228 114 0094',text));
 assert.equal(link.origin,'https://wa.me');assert.equal(link.pathname,'/522281140094');assert.equal(link.searchParams.get('text'),text);
 for(const phone of ['', '123','52abc2281140094','https://example.test','+0000000000'])assert.throws(()=>whatsappLink(phone,text),/INVALID_WHATSAPP_PHONE/);
});

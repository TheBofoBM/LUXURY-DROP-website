import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOrderRequest,whatsappLink} from '../dist/order-request.js';

const now=Date.parse('2026-11-03T18:00:00Z');
const coupon={id:'coupon-id',code:'LD-ABC123',discount_percent:25,amount_cents:null,status:'available',expires_at:'2026-11-04T18:00:00Z'};
const one=[{id:'boss-navy',size:'M',qty:1}];

test('WhatsApp inquiry includes actual garments, sizes and exact percentage totals without consuming a coupon',()=>{
 const before=structuredClone(coupon);
 const order=createOrderRequest([{id:'boss-navy',size:'S',qty:1},{id:'hugo-black',size:'L',qty:1}],{coupon,now});
 assert.equal(order.subtotal,2998);assert.equal(order.discount,749.5);assert.equal(order.total,2248.5);
 assert.match(order.text,/Playera BOSS.*Talla Chica \(S\)/);assert.match(order.text,/Playera HUGO.*Talla Grande \(L\)/);
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
 const order=createOrderRequest([...one,{id:'boss-navy',size:'M',qty:8},{id:'hugo-black',size:'XL',qty:1}]);
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

test('Daily Drop is exactly three garments for 1299, with no automatic tier discount',()=>{
 const order=createOrderRequest([{id:'daily-pack',size:'S-M-L',qty:1}],{now});
 assert.equal(order.subtotal,1299);assert.equal(order.discount,0);assert.equal(order.total,1299);
 assert.match(order.text,/1 paquete \(3 playeras\)/);assert.match(order.text,/100% algodón/);
 assert.match(order.text,/Chica \(S\) \/ Mediana \(M\) \/ Grande \(L\)/);
 assert.doesNotMatch(order.text,/Mi código de cupón/);
});

test('Daily Drop accepts a valid first-purchase coupon: 25 percent gives exactly 974.25',()=>{
 const original=structuredClone(coupon);
 const order=createOrderRequest([{id:'daily-pack',size:'M-M-M',qty:1}],{coupon,now});
 assert.equal(order.discount,324.75);assert.equal(order.total,974.25);assert.equal(order.coupon.code,coupon.code);
 assert.match(order.text,/\$974\.25/);assert.deepEqual(coupon,original);
 for(const invalid of [{...coupon,status:'used'},{...coupon,expires_at:new Date(now).toISOString()},{...coupon,preview:true}]){
  const rejected=createOrderRequest(order.lines,{coupon:invalid,now});
  assert.equal(rejected.total,1299);assert.equal(rejected.coupon,null);
 }
});

test('Daily pack sizes must be three valid choices and separate combinations stay separate',()=>{
 for(const size of ['M','S-M','S-M-XL','S-M-L-L','M-M-M<script>']){
  assert.throws(()=>createOrderRequest([{id:'daily-pack',size,qty:1}]),/EMPTY_CART/);
 }
 const order=createOrderRequest([{id:'daily-pack',size:'S-M-L',qty:2},{id:'daily-pack',size:'L-L-L',qty:8}]);
 assert.deepEqual(order.lines,[{id:'daily-pack',size:'S-M-L',qty:2},{id:'daily-pack',size:'L-L-L',qty:3}]);
 assert.equal(order.subtotal,6495);assert.equal(order.discount,0);assert.match(order.text,/2 paquetes \(6 playeras\)/);
});

test('mixed collections calculate tiers only on Luxury Edition and never stack with a welcome coupon',()=>{
 const lines=[{id:'daily-pack',size:'S-M-L',qty:1},{id:'boss-navy',size:'M',qty:1}];
 const standard=createOrderRequest(lines,{now});
 assert.equal(standard.subtotal,2798);assert.equal(standard.tierRate,.05);assert.equal(standard.discount,74.95);
 const welcome=createOrderRequest(lines,{coupon,now});
 assert.equal(welcome.discount,699.5);assert.equal(welcome.total,2098.5);
 const smaller=createOrderRequest(lines,{coupon:{...coupon,discount_percent:5},now});
 assert.equal(smaller.discount,139.9);assert.equal(smaller.total,2658.1);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createOrderRequest,whatsappLink} from '../dist/order-request.js';

const one=[{id:'boss-navy',size:'M',qty:1}];
const coupon={id:'old-coupon',code:'LD-ABC123',discount_percent:25,amount_cents:null,status:'available',expires_at:'2099-11-04T18:00:00Z'};

test('guest inquiry includes actual garments, sizes and Black Friday totals with no coupon requirement',()=>{
 const single=createOrderRequest(one);assert.equal(single.subtotal,1499);assert.equal(single.discount,849);assert.equal(single.total,650);
 const order=createOrderRequest([{id:'boss-navy',size:'S',qty:1},{id:'hugo-black',size:'L',qty:1}]);
 assert.equal(order.subtotal,2998);assert.equal(order.discount,1698);assert.equal(order.total,1300);
 assert.match(order.text,/Playera BOSS.*Talla Chica \(S\).*\$650\.00/);
 assert.match(order.text,/Playera HUGO.*Talla Grande \(L\).*\$650\.00/);
 assert.match(order.text,/Subtotal antes de descuentos: \$2,998\.00/);
 assert.match(order.text,/ahorro \$1,698\.00/);assert.match(order.text,/Total estimado de productos: \$1,300\.00/);
 assert.match(order.text,/Black Friday/);assert.match(order.text,/Envío por confirmar/);
 assert.doesNotMatch(order.text,/cupón|código|primera compra|por monto|25%/i);
});

test('old percentage and fixed coupons never stack with Black Friday or mutate historical codes',()=>{
 for(const candidate of [coupon,{...coupon,discount_percent:null,amount_cents:40000},{...coupon,discount_percent:100},{...coupon,status:'used'},{...coupon,preview:true}]){
  const original=structuredClone(candidate);
  const order=createOrderRequest(one,{coupon:candidate});
  assert.equal(order.total,650);assert.equal(order.discount,849);assert.equal(order.coupon,null);
  assert.doesNotMatch(order.text,/LD-ABC123/);assert.deepEqual(candidate,original);
 }
});

test('removed Daily Drop cannot be ordered from old saved bags and request limits still apply',()=>{
 assert.throws(()=>createOrderRequest([]),/EMPTY_CART/);
 assert.throws(()=>createOrderRequest([{id:'daily-pack',size:'S-M-L',qty:1}]),/EMPTY_CART/);
 const order=createOrderRequest([...one,{id:'daily-pack',size:'M-M-M',qty:2},{id:'boss-navy',size:'L',qty:8},{id:'hugo-black',size:'XL',qty:1}]);
 assert.deepEqual(order.lines,[{id:'boss-navy',size:'M',qty:1},{id:'boss-navy',size:'L',qty:4}]);
 assert.equal(order.subtotal,7495);assert.equal(order.discount,4245);assert.equal(order.total,3250);
 assert.doesNotMatch(order.text,/Daily Drop/);assert.match(order.text,/Bajo pedido/);
});

test('WhatsApp link preserves the complete promotion text and rejects invalid phone numbers',()=>{
 const text=createOrderRequest(one).text+'\nReferencia: algodón & talla + color #1';
 const link=new URL(whatsappLink('+52 228 114 0094',text));
 assert.equal(link.origin,'https://wa.me');assert.equal(link.pathname,'/522281140094');assert.equal(link.searchParams.get('text'),text);
 for(const phone of ['', '123','52abc2281140094','https://example.test','+0000000000'])assert.throws(()=>whatsappLink(phone,text),/INVALID_WHATSAPP_PHONE/);
});

test('mixed cap and shirt inquiry charges 1700 and does not discount the white cap or invent its fit',()=>{
 const order=createOrderRequest([...one,{id:'cap-champion-black',size:'U',qty:1},{id:'cap-wes-trn-white',size:'U',qty:1}]);
 assert.equal(order.subtotal,2699);assert.equal(order.discount,999);assert.equal(order.total,1700);
 assert.match(order.text,/Gorra Champion.*Ajuste por confirmar.*\$450\.00.*Black Friday/);
 const whiteLine=order.text.split('\n').find(line=>line.includes('WES-TRN'));
 assert.match(whiteLine,/\$600\.00/);assert.doesNotMatch(whiteLine,/Black Friday|Talla M/);
 const whiteOnly=createOrderRequest([{id:'cap-wes-trn-white',size:'U',qty:1}]);
 assert.equal(whiteOnly.discount,0);assert.equal(whiteOnly.total,600);assert.doesNotMatch(whiteOnly.text,/Black Friday|Daily Drop/);
});

test('storefront removes wheel and Daily Drop entrypoints while retaining account and administrator access',async()=>{
 const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const welcome=await readFile(new URL('../dist/welcome-ui.js',import.meta.url),'utf8');
 const service=await readFile(new URL('../dist/welcome-service.js',import.meta.url),'utf8');
 assert.doesNotMatch(html,/wheel-dialog|daily-pack|daily-drop|ruleta|gira|974\.25/i);
 assert.doesNotMatch(app+welcome,/showWheel|claimCoupon|#spin|#daily-pack|ld:apply-coupon/);
 assert.doesNotMatch(service,/ld_claim_welcome/);
 for(const id of ['profile-open','google-signin','profile-dialog','admin-dialog','black-friday-info','terms-open'])assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/Descuento automático|descuento automático/);
 assert.doesNotMatch(welcome,/setTimeout\(.*showWelcome/);
});

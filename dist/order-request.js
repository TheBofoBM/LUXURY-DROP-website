import {products,sanitizeCart,totals} from './catalog.js';
import {welcomeDiscount,couponLabel} from './welcome-model.js';

const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(value);

export function whatsappLink(phone,text){
  const normalized=String(phone??'').replace(/[\s()+.-]/g,'');
  if(!/^[1-9][0-9]{7,14}$/.test(normalized))throw new Error('INVALID_WHATSAPP_PHONE');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

// This creates an inquiry only. It never reserves inventory, creates a paid
// order, or calls a coupon redemption function. The owner validates the sale.
export function createOrderRequest(cart,{coupon=null,now=Date.now()}={}){
  const lines=sanitizeCart(cart);
  if(!lines.length)throw new Error('EMPTY_CART');
  const t=totals(lines);
  const realCoupon=coupon&&!coupon.preview&&!String(coupon.code).startsWith('LD-DEMO-')?coupon:null;
  const selected=welcomeDiscount(t.subtotal,realCoupon,now);
  const useWelcome=selected>0&&selected>=t.discount;
  const discount=Math.max(t.discount,selected);
  const total=Math.round((t.subtotal-discount)*100)/100;
  const promotion=useWelcome?`Cupón de bienvenida: ${couponLabel(realCoupon)}`:t.rate?`Promoción por monto: ${Math.round(t.rate*100)}%`:'Sin descuento';
  const appliedCoupon=useWelcome?realCoupon:null;
  const text=[
    'Hola, quiero hacer un pedido en LUXURY DROP.',
    '',
    ...lines.map(l=>{const p=products.find(p=>p.id===l.id);return `${l.qty} × ${p.name} · ${p.detail} · Talla ${l.size} — ${money(p.price*l.qty)} MXN`;}),
    '',
    `Subtotal de prendas: ${money(t.subtotal)} MXN`,
    `${promotion} — ahorro ${money(discount)} MXN`,
    `Total estimado de prendas: ${money(total)} MXN`,
    ...(appliedCoupon?['',`Mi código de cupón: ${appliedCoupon.code}`]:[]),
    '',
    '¿Me confirmas disponibilidad, descuento y forma de entrega?',
    'Pago en efectivo o transferencia, por acordar. Envío por confirmar; no está incluido en el total.',
    ...(appliedCoupon?['El cupón está sujeto a validación y sigue sin canjearse.']:[])
  ].join('\n');
  return {lines,subtotal:t.subtotal,tierDiscount:t.discount,tierRate:t.rate,selected,discount,total,useWelcome,coupon:appliedCoupon,text};
}

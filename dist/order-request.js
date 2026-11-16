import {products,sanitizeCart,totals,sizeLabel,salePrice,campaign} from './catalog.js';

const money=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2}).format(value);

export function whatsappLink(phone,text){
  const normalized=String(phone??'').replace(/[\s()+.-]/g,'');
  if(!/^[1-9][0-9]{7,14}$/.test(normalized))throw new Error('INVALID_WHATSAPP_PHONE');
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

// This creates an inquiry only. It never reserves inventory, creates a paid
// order, or calls a coupon redemption function. The owner validates the sale.
export function createOrderRequest(cart){
  const lines=sanitizeCart(cart);
  if(!lines.length)throw new Error('EMPTY_CART');
  const t=totals(lines);
  // The campaign is automatic for everyone. Old coupon arguments cannot stack.
  const {discount,total}=t;
  const promotion=discount?`${campaign.name}: Luxury Edition a $650.00 MXN por playera`:'Daily Drop: precio por paquete';
  const text=[
    'Hola, quiero hacer un pedido en LUXURY DROP.',
    '',
    ...lines.map(l=>{const p=products.find(p=>p.id===l.id);return `${l.qty}${p.units?` paquete${l.qty===1?'':'s'} (${l.qty*p.units} playeras)`: ''} × ${p.name} · ${p.collection} · ${p.detail} · ${p.units?'Tallas de las 3 playeras':'Talla'} ${sizeLabel(l.size)}${p.fulfillment==='on-request'?' · Bajo pedido':''} — ${money(salePrice(p)*l.qty)} MXN${salePrice(p)<p.price?` (${money(salePrice(p))} MXN c/u, Black Friday)`:''}`;}),
    '',
    `Subtotal antes de descuentos: ${money(t.subtotal)} MXN`,
    `${promotion} — ahorro ${money(discount)} MXN`,
    `Total estimado de prendas: ${money(total)} MXN`,
    '',
    '¿Me confirmas disponibilidad, descuento y forma de entrega?',
    'Pago en efectivo o transferencia, por acordar. Envío por confirmar; no está incluido en el total.'
  ].join('\n');
  return {lines,subtotal:t.subtotal,discount,total,coupon:null,text};
}

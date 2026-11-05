// DROP 01. stock is the per-model request limit; availability is confirmed by chat.
export const products = [
  {id:'boss-navy',name:'Playera BOSS',category:'Playeras',detail:'Azul marino · Logo frontal',price:1499,image:'drop-01-boss-azul-marino.png',sizes:['S','M','L'],tag:'DROP 01 / 01',stock:5,fulfillment:'on-request',color:'#172036'},
  {id:'hugo-black',name:'Playera HUGO',category:'Playeras',detail:'Negro · Estampado frontal',price:1499,image:'drop-01-hugo-negra.png',sizes:['S','M','L'],tag:'DROP 01 / 02',stock:5,fulfillment:'on-request',color:'#232323'},
  {id:'lacoste-green',name:'Playera Lacoste',category:'Playeras',detail:'Verde · Franjas en hombros',price:1499,image:'drop-01-lacoste-verde.png',sizes:['S','M','L'],tag:'DROP 01 / 03',stock:5,fulfillment:'on-request',color:'#064e40'}
];
export const sizeName = size => ({S:'Chica',M:'Mediana',L:'Grande'}[size]||size);
export const sizeLabel = size => `${sizeName(size)} (${size})`;
export const campaign = {tiers:[{min:1000,rate:0.05},{min:2000,rate:0.10}]};
export function totals(cart) {
  const subtotal = cart.reduce((sum,line) => sum + (products.find(p=>p.id===line.id)?.price || 0)*line.qty,0);
  const rate = campaign.tiers.filter(t=>subtotal>=t.min).at(-1)?.rate || 0;
  const discount = Math.round(subtotal*rate*100)/100;
  return {subtotal,rate,discount,total:Math.round((subtotal-discount)*100)/100};
}
export function sanitizeCart(value) {
  if (!Array.isArray(value)) return [];
  const result=[];
  for (const line of value) {
    const product=products.find(p=>p.id===line?.id);
    if (!product || !product.sizes.includes(line.size) || !Number.isInteger(line.qty) || line.qty<1) continue;
    const existing=result.find(l=>l.id===line.id&&l.size===line.size);
    const used=result.filter(l=>l.id===line.id).reduce((n,l)=>n+l.qty,0);
    const qty=Math.min(line.qty,product.stock-used);
    if (qty>0) { if(existing) existing.qty+=qty; else result.push({id:line.id,size:line.size,qty}); }
  }
  return result;
}

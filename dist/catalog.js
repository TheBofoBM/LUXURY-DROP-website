// Catálogo ilustrativo. Sustituir por inventario real antes de vender.
export const products = [
  {id:'tee',name:'Essential Tee',category:'Playeras',detail:'Algodón · Blanco',price:449,image:'tee.jpg',sizes:['S','M','L','XL'],tag:'EL BÁSICO',stock:8},
  {id:'hoodie',name:'Everyday Hoodie',category:'Hoodies',detail:'Fit relajado · Mostaza',price:899,image:'hoodie.jpg',sizes:['S','M','L'],tag:'DROP 01',stock:5},
  {id:'jacket',name:'Midnight Jacket',category:'Chamarras',detail:'Estilo biker · Negro',price:1299,image:'jacket.jpg',sizes:['S','M','L'],tag:'STATEMENT PIECE',stock:3},
  {id:'denim',name:'Classic Denim',category:'Jeans',detail:'Corte recto · Azul',price:749,image:'denim.jpg',sizes:['28','30','32','34'],tag:'DAILY ROTATION',stock:6}
];
export const campaign = {tiers:[{min:1000,rate:0.05},{min:2000,rate:0.10}],spinMinimum:1500};
export const prizes = ['5% extra','Envío gratis','10% extra','Gorra de regalo','5% extra','Playera de regalo'];
export function totals(cart) {
  const subtotal = cart.reduce((sum,line) => sum + (products.find(p=>p.id===line.id)?.price || 0)*line.qty,0);
  const rate = campaign.tiers.filter(t=>subtotal>=t.min).at(-1)?.rate || 0;
  const discount = Math.round(subtotal*rate*100)/100;
  return {subtotal,rate,discount,total:subtotal-discount,spinEligible:subtotal>=campaign.spinMinimum};
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

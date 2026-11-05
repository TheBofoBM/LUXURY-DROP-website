// DROP 01. stock is the per-model request limit; availability is confirmed by chat.
const dailySizes=['S','M','L'].flatMap(a=>['S','M','L'].flatMap(b=>['S','M','L'].map(c=>`${a}-${b}-${c}`)));
export const products = [
  {id:'boss-navy',collection:'Luxury Edition',material:'100% algodón spandex',quality:'Calidad original',description:'El azul marino y el logo BOSS en contraste hacen de esta playera una pieza fácil de combinar, con presencia en cada detalle.',features:['Cuello redondo con ribete','Manga corta','Logo BOSS al frente en contraste','Color azul marino'],closing:'Hazle espacio a ese básico que completa tu look.',name:'Playera BOSS',category:'Playeras',detail:'Azul marino · Logo frontal',price:1499,image:'drop-01-boss-azul-marino.png',sizes:['S','M','L'],tag:'DROP 01 / 01',stock:5,fulfillment:'on-request',color:'#172036'},
  {id:'hugo-black',collection:'Luxury Edition',material:'100% algodón spandex',quality:'Calidad original',description:'Negro y gráfico tonal HUGO al frente: una combinación de líneas simples para llevar tu estilo a tu manera.',features:['Cuello redondo','Manga corta','Gráfico rectangular HUGO al frente','Color negro con estampado tonal'],closing:'Tu próxima favorita puede empezar con un clásico en negro.',name:'Playera HUGO',category:'Playeras',detail:'Negro · Estampado frontal',price:1499,image:'drop-01-hugo-negra.png',sizes:['S','M','L'],tag:'DROP 01 / 02',stock:5,fulfillment:'on-request',color:'#232323'},
  {id:'lacoste-green',collection:'Luxury Edition',material:'100% algodón spandex',quality:'Calidad original',description:'El verde, las franjas en hombros y mangas y el distintivo cocodrilo al pecho aportan un acento deportivo a tu rotación.',features:['Cuello redondo','Manga corta','Franjas en contraste en hombros y mangas','Distintivo Lacoste al pecho'],closing:'Un toque de verde para darle otra intención a tu outfit.',name:'Playera Lacoste',category:'Playeras',detail:'Verde · Franjas en hombros',price:1499,image:'drop-01-lacoste-verde.png',sizes:['S','M','L'],tag:'DROP 01 / 03',stock:5,fulfillment:'on-request',color:'#064e40'},
  {id:'daily-pack',name:'Paquete Daily Drop',category:'Playeras',collection:'Daily Drop',material:'100% algodón',quality:'Buena calidad para el día a día',description:'Tres playeras de 100% algodón para renovar tu rotación diaria. Elige una talla para cada prenda y confirmamos contigo modelos, colores y entrega por WhatsApp.',features:['Paquete de 3 playeras','100% algodón','Chica, Mediana y Grande; puedes combinar tallas','Modelos y colores por confirmar por WhatsApp'],closing:'Tres nuevas razones para estrenar todos los días.',detail:'3 playeras · 100% algodón · Modelos y colores por confirmar',price:1299,image:'daily-drop-pack.svg',imageAlt:'Ilustración del paquete Daily Drop de tres playeras; modelos y colores por confirmar',sizes:dailySizes,tag:'DAILY DROP / PACK 03',stock:5,units:3,fulfillment:'on-request',color:'#d8bd7b'}
];
export const sizeName = size => ({S:'Chica',M:'Mediana',L:'Grande'}[size]||size);
export const sizeLabel = size => String(size).split('-').map(code=>`${sizeName(code)} (${code})`).join(' / ');
export const campaign = {tiers:[{min:1000,rate:0.05},{min:2000,rate:0.10}]};
export function totals(cart) {
  const subtotal = cart.reduce((sum,line) => sum + (products.find(p=>p.id===line.id)?.price || 0)*line.qty,0);
  const promotionSubtotal = cart.reduce((sum,line)=>{const p=products.find(p=>p.id===line.id);return sum+(p&&p.collection==='Luxury Edition'?p.price*line.qty:0);},0);
  const rate = campaign.tiers.filter(t=>promotionSubtotal>=t.min).at(-1)?.rate || 0;
  const discount = Math.round(promotionSubtotal*rate*100)/100;
  return {subtotal,promotionSubtotal,rate,discount,total:Math.round((subtotal-discount)*100)/100};
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

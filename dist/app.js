import { products, campaign, prizes, totals, sanitizeCart } from './catalog.js';
const $ = s=>document.querySelector(s);
const money = n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2}).format(n);
let cart=[];try {cart=sanitizeCart(JSON.parse(localStorage.getItem('ld-cart-v1')||'[]'));}catch{}
let category='Todo', query='', selectedProduct=null, selectedSize=null, spinning=false, spinResult=null;
try { const saved=JSON.parse(sessionStorage.getItem('ld-spin-v1')||'null'); if(Number.isInteger(saved)&&saved>=0&&saved<prizes.length) spinResult=saved; }catch{}
const count = ()=>cart.reduce((n,l)=>n+l.qty,0);
function persist(){try{localStorage.setItem('ld-cart-v1',JSON.stringify(cart));}catch{} renderCart();}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function renderProducts(){
  let list=products.filter(p=>(category==='Todo'||p.category===category)&&`${p.name} ${p.category} ${p.detail}`.toLocaleLowerCase('es-MX').includes(query));
  if($('#sort').value==='low') list.sort((a,b)=>a.price-b.price);
  if($('#sort').value==='high') list.sort((a,b)=>b.price-a.price);
  const colors={tee:'#f6f5f1',hoodie:'#b7913e',jacket:'#242521',denim:'#4b647f'};
  $('#products').innerHTML=list.length?list.map(p=>`<article class="product"><div class="product-photo"><button data-product="${p.id}" aria-label="Ver ${p.name}"><img src="assets/${p.image}" alt="${p.name}, ${p.detail}" loading="lazy"></button><span class="product-tag">${p.tag}</span><button class="product-add" data-product="${p.id}" aria-label="Elegir talla de ${p.name}">+</button></div><div class="product-info"><div><button class="product-name" data-product="${p.id}">${p.name}</button><p>${p.detail}</p></div><span class="product-price">${money(p.price)}</span></div><div class="swatches"><i style="--swatch:${colors[p.id]}"></i><span>${p.sizes.join(' / ')}</span></div></article>`).join(''):'<p class="no-results">No encontramos esa pieza. Prueba otra búsqueda o categoría.</p>';
  $('#results-status').textContent=`${list.length} prendas encontradas`;
}
$('#products').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)showProduct(b.dataset.product);});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(btn=>{const on=btn===b;btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',on);});renderProducts();}));
$('#sort').addEventListener('change',renderProducts);
$('#search-toggle').addEventListener('click',()=>{$('#search-box').hidden=false;$('#catalogo').scrollIntoView();$('#search').focus({preventScroll:true});});
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('es-MX');renderProducts();});
$('#search-clear').addEventListener('click',()=>{$('#search').value='';query='';renderProducts();$('#search').focus();});
function showProduct(id){
  selectedProduct=products.find(p=>p.id===id);selectedSize=null;const p=selectedProduct;
  $('#product-detail').innerHTML=`<div class="product-detail-grid"><img src="assets/${p.image}" alt="${p.name}"><div class="detail-copy"><p class="eyebrow">DROP 01 / ${p.category.toUpperCase()}</p><h2>${p.name}</h2><p>${p.detail}</p><div class="detail-price">${money(p.price)} <small>MXN</small></div><span class="size-label" id="size-label">Elige tu talla</span><div class="sizes" role="group" aria-labelledby="size-label">${p.sizes.map(s=>`<button data-size="${s}" aria-pressed="false">${s}</button>`).join('')}</div><button id="add-cart" class="button gold" disabled>Selecciona una talla <span>+</span></button><p class="detail-note">Pieza de ejemplo para explorar el diseño. Las tallas, existencias y características son ilustrativas.</p></div></div>`;
  openDialog('#product-dialog');
}
$('#product-detail').addEventListener('click',e=>{
  const b=e.target.closest('[data-size]');
  if(b){selectedSize=b.dataset.size;document.querySelectorAll('[data-size]').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',s===b);});$('#add-cart').disabled=false;$('#add-cart').innerHTML='Añadir a mi bolsa <span>+</span>';}
  if(e.target.closest('#add-cart')&&selectedSize){const p=selectedProduct;const used=cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0);if(used>=p.stock){toast('Alcanzaste la existencia de ejemplo de esta prenda.');return;}const line=cart.find(l=>l.id===p.id&&l.size===selectedSize);if(line)line.qty++;else cart.push({id:p.id,size:selectedSize,qty:1});persist();$('#product-dialog').close();toast(`${p.name} se añadió a tu bolsa`);}
});
function renderCart(){
  $('#cart-count').textContent=count();$('#drawer-count').textContent=`(${count()})`;
  if(!cart.length){$('#cart-content').innerHTML='<div class="cart-empty"><h2>Tu próximo fit<br>empieza aquí.</h2><p>Aún no hay piezas en tu bolsa.<br>Explora el drop y elige tus favoritas.</p><button class="button gold" id="continue-shopping">Explorar el drop <span>↗</span></button></div>';return;}
  const t=totals(cart);const next=campaign.tiers.find(tier=>tier.min>t.subtotal);
  $('#cart-content').innerHTML=cart.map((l,i)=>{const p=products.find(p=>p.id===l.id);return `<article class="cart-line"><img src="assets/${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>Talla ${l.size}</p><div class="quantity"><button data-qty="-1" data-index="${i}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${l.qty}</span><button data-qty="1" data-index="${i}" aria-label="Agregar una unidad de ${p.name}">+</button></div></div><div class="line-end"><span>${money(p.price*l.qty)}</span><button class="remove" data-remove="${i}">Eliminar</button></div></article>`;}).join('')+`<div class="cart-progress"><p>${next?`Te faltan <strong>${money(next.min-t.subtotal)}</strong> para desbloquear ${Math.round(next.rate*100)}% de descuento.`:'<strong>¡Nivel máximo! Tienes 10% de descuento.</strong>'}</p><div class="progress-track"><span style="width:${Math.min(t.subtotal/2000*100,100)}%"></span></div><small>${t.spinEligible?'✳ Ruleta de demostración desbloqueada.':`Te faltan ${money(campaign.spinMinimum-t.subtotal)} para probar la ruleta.`}</small></div><div class="totals"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="discount"><span>Descuento ${Math.round(t.rate*100)}%</span><span>− ${money(t.discount)}</span></div><div class="total"><span>Total de ejemplo</span><span>${money(t.total)} <small>MXN</small></span></div></div><button class="button gold cart-action" id="order-preview">Ver resumen de ejemplo <span>↗</span></button><button class="cart-wheel" id="cart-wheel">${t.spinEligible?'Probar mi giro de demostración ↗':'Ver la ruleta de premios ↗'}</button><p class="cart-disclaimer">Esta es una demostración. No se enviará ningún pedido.<br>Envío y pago pendientes de configurar.</p>`;
}
$('#cart-open').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#cart-content').addEventListener('click',e=>{
  const qty=e.target.closest('[data-qty]');const remove=e.target.closest('[data-remove]');
  if(qty){const index=Number(qty.dataset.index);const line=cart[index];const p=products.find(p=>p.id===line.id);const delta=Number(qty.dataset.qty);if(delta>0&&cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0)>=p.stock){toast('Alcanzaste la existencia de ejemplo de esta prenda.');return;}line.qty+=delta;if(line.qty<=0)cart.splice(index,1);persist();const equivalent=$(`#cart-content [data-index="${index}"][data-qty="${delta}"]`);(equivalent||$('#cart-dialog .close')).focus();}
  if(remove){cart.splice(Number(remove.dataset.remove),1);persist();$('#cart-dialog .close').focus();}
  if(e.target.closest('#continue-shopping')){$('#cart-dialog').close();$('#catalogo').scrollIntoView();}
  if(e.target.closest('#cart-wheel')){$('#cart-dialog').close();showWheel();}
  if(e.target.closest('#order-preview'))showOrder();
});
function showWheel(){const t=totals(cart);$('#wheel-status').textContent=t.spinEligible?'Tu bolsa alcanzó $1,500. ¡Prueba tu giro!':`Añade ${money(campaign.spinMinimum-t.subtotal)} a tu bolsa para desbloquear el giro de ejemplo.`;$('#spin').disabled=!t.spinEligible||spinning||spinResult!==null;$('#wheel-result').textContent=spinResult!==null?`Resultado de prueba: ${prizes[spinResult]}`:'';openDialog('#wheel-dialog');}
$('#wheel-open').addEventListener('click',showWheel);
$('#spin').addEventListener('click',()=>{
  if(spinning||spinResult!==null||!totals(cart).spinEligible)return;
  spinning=true;$('#spin').disabled=true;
  const random=new Uint32Array(1);crypto.getRandomValues(random);spinResult=Math.floor(random[0]/4294967296*prizes.length);
  // Persist before animation so closing the dialog cannot create another attempt.
  try{sessionStorage.setItem('ld-spin-v1',JSON.stringify(spinResult));}catch{}
  $('#wheel').style.transform=`rotate(${2160+360-(spinResult*60+30)}deg)`;
  setTimeout(()=>{spinning=false;$('#wheel-result').textContent=`Resultado de prueba: ${prizes[spinResult]}`;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:3550);
});
function info(content){$('#info-content').innerHTML=content;openDialog('#info-dialog');}
$('#terms-open').addEventListener('click',()=>info('<p class="eyebrow">LUXURY REWARDS</p><h2>Así se prueba<br>la idea.</h2><ul><li>El subtotal de la bolsa desbloquea 5% desde $1,000 o 10% desde $2,000 MXN. Se aplica únicamente el nivel más alto.</li><li>Desde $1,500 de subtotal se habilita un giro de demostración por sesión de pestaña. Los seis segmentos tienen la misma probabilidad; el premio de 5% aparece dos veces.</li><li>Los premios son simulados: no se canjean ni se suman al descuento de la bolsa.</li><li>Antes del lanzamiento definiremos vigencia, existencias, elegibilidad y condiciones de cada promoción.</li></ul><small>La versión comercial deberá validar pagos, descuentos y premios en el servidor, vinculando cada giro a un pedido pagado.</small>'));
$('#credits-open').addEventListener('click',()=>info('<p class="eyebrow">CRÉDITOS</p><h2>Detrás del concepto.</h2><p>Logo proporcionado por Luxury Drop. Las fotografías de referencia se obtuvieron de Unsplash y no representan inventario de la tienda.</p><ul><li><a href="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab" target="_blank" rel="noreferrer">Playera: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1556821840-3a63f95609a7" target="_blank" rel="noreferrer">Hoodie: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1551028719-00167b16eac5" target="_blank" rel="noreferrer">Chamarra: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1542272604-787c3835535d" target="_blank" rel="noreferrer">Jeans: referencia fotográfica</a></li></ul><small>Tipografía: Barlow Condensed y DM Sans, distribuidas mediante Google Fonts.</small>'));
let orderText='';
function showOrder(){const t=totals(cart);orderText='LUXURY DROP · RESUMEN DE DEMOSTRACIÓN\n\n'+cart.map(l=>{const p=products.find(p=>p.id===l.id);return `${l.qty} × ${p.name} / Talla ${l.size} — ${money(l.qty*p.price)}`;}).join('\n')+`\n\nSubtotal: ${money(t.subtotal)}\nDescuento: ${money(t.discount)}\nTotal ilustrativo: ${money(t.total)} MXN\n\nNo es un pedido. Sin pago ni envío configurados.`;info('<p class="eyebrow">SOLO PARA EXPLORAR</p><h2>Así se vería<br>tu selección.</h2><pre class="order-summary" id="order-text"></pre><button class="button gold" id="copy-order">Copiar resumen <span>↗</span></button><small>No se reserva inventario ni se registra una compra.</small>');$('#order-text').textContent=orderText;}
$('#info-content').addEventListener('click',async e=>{if(e.target.closest('#copy-order')){try{await navigator.clipboard.writeText(orderText);$('#copy-order').textContent='Resumen copiado ✓';}catch{$('#copy-order').textContent='Selecciona y copia el texto de arriba';}}});
renderProducts();renderCart();

import { products, campaign, totals, sanitizeCart } from './catalog.js';
import { setupWelcome,showWheel } from './welcome-ui.js';
import { currentWelcome,currentUser,now } from './welcome-service.js';
import { welcomeDiscount } from './welcome-model.js';
const $ = s=>document.querySelector(s);
const money = n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2}).format(n);
let cart=[];try {cart=sanitizeCart(JSON.parse(localStorage.getItem('ld-cart-v1')||'[]'));}catch{}
let category='Todo', query='', selectedProduct=null, selectedSize=null, appliedCouponId=null;
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
  const coupon=currentWelcome().coupon;
  const selected=currentUser()&&coupon?.id===appliedCouponId?welcomeDiscount(t.subtotal,coupon,now()):0;
  const discount=Math.max(t.discount,selected);
  const useWelcome=selected>0&&selected>=t.discount;
  const couponInfo=selected?`<div class="coupon-applied"><strong>${money(coupon.amount_cents/100)} MXN de bienvenida</strong>${useWelcome?'Aplicado a esta vista previa.':'Tu descuento por monto es mayor; conservamos el mejor ahorro.'}<br>No se reserva ni se canjea el código al previsualizar.<button id="remove-coupon">Quitar de la vista previa</button></div>`:'<button id="cart-wheel" class="cart-coupon-invite">✳ Tu primer drop puede tener hasta $400 MXN menos.<br>Consulta tu bienvenida y tus cupones ↗</button>';
  $('#cart-content').innerHTML=cart.map((l,i)=>{const p=products.find(p=>p.id===l.id);return `<article class="cart-line"><img src="assets/${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>Talla ${l.size}</p><div class="quantity"><button data-qty="-1" data-index="${i}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${l.qty}</span><button data-qty="1" data-index="${i}" aria-label="Agregar una unidad de ${p.name}">+</button></div></div><div class="line-end"><span>${money(p.price*l.qty)}</span><button class="remove" data-remove="${i}">Eliminar</button></div></article>`;}).join('')+`<div class="cart-progress"><p>${next?`Te faltan <strong>${money(next.min-t.subtotal)}</strong> para desbloquear ${Math.round(next.rate*100)}% de descuento.`:'<strong>¡Nivel máximo! Tienes 10% de descuento.</strong>'}</p><div class="progress-track"><span style="width:${Math.min(t.subtotal/2000*100,100)}%"></span></div><small>Promociones no acumulables: mostramos el mejor descuento.</small></div>${couponInfo}<div class="totals"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="discount"><span>${useWelcome?'Cupón de bienvenida':`Descuento ${Math.round(t.rate*100)}%`}</span><span>− ${money(discount)}</span></div><div class="total"><span>Total de ejemplo</span><span>${money(Math.round((t.subtotal-discount)*100)/100)} <small>MXN</small></span></div></div><button class="button gold cart-action" id="order-preview">Ver resumen de ejemplo <span>↗</span></button><p class="cart-disclaimer">Esta es una demostración. No se enviará ningún pedido.<br>Los cupones no se consumen al explorar la bolsa.</p>`;
}
$('#cart-open').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#cart-content').addEventListener('click',e=>{
  const qty=e.target.closest('[data-qty]');const remove=e.target.closest('[data-remove]');
  if(qty){const index=Number(qty.dataset.index);const line=cart[index];const p=products.find(p=>p.id===line.id);const delta=Number(qty.dataset.qty);if(delta>0&&cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0)>=p.stock){toast('Alcanzaste la existencia de ejemplo de esta prenda.');return;}line.qty+=delta;if(line.qty<=0)cart.splice(index,1);persist();const equivalent=$(`#cart-content [data-index="${index}"][data-qty="${delta}"]`);(equivalent||$('#cart-dialog .close')).focus();}
  if(remove){cart.splice(Number(remove.dataset.remove),1);persist();$('#cart-dialog .close').focus();}
  if(e.target.closest('#continue-shopping')){$('#cart-dialog').close();$('#catalogo').scrollIntoView();}
  if(e.target.closest('#cart-wheel')){$('#cart-dialog').close();showWheel();}
  if(e.target.closest('#remove-coupon')){appliedCouponId=null;renderCart();}
  if(e.target.closest('#order-preview'))showOrder();
});
function info(content){$('#info-content').innerHTML=content;openDialog('#info-dialog');}
$('#terms-open').addEventListener('click',()=>info('<p class="eyebrow">LUXURY REWARDS / BIENVENIDA</p><h2>Tu primer drop,<br>con algo extra.</h2><ul><li>Un giro por cuenta con correo verificado y sin compras pagadas anteriores. No necesitas llenar la bolsa para girar.</li><li>Premios y probabilidades propuestas: $50 (35%), $100 (30%), $150 (20%), $200 (10%), $300 (4%) o $400 MXN (1%). Los segmentos de la ruleta son ilustrativos; las probabilidades no son iguales.</li><li>El cupón se guarda al girar en Perfil → Cupones y vence exactamente 24 horas después, aunque cierres la página o la animación.</li><li>Es personal, intransferible y de un solo uso en tu primera compra. No se puede repartir entre pedidos ni cambiar por efectivo. El descuento no supera el valor de los productos.</li><li>No se acumula con descuentos por monto; se aplica el mayor ahorro. Un cupón vencido o utilizado no genera otro giro.</li><li>En esta vista previa los perfiles y cupones son de ejemplo, no son canjeables. Revisaremos estas condiciones antes del lanzamiento comercial.</li></ul>'));
$('#credits-open').addEventListener('click',()=>info('<p class="eyebrow">CRÉDITOS</p><h2>Detrás del concepto.</h2><p>Logo proporcionado por Luxury Drop. Las fotografías de referencia se obtuvieron de Unsplash y no representan inventario de la tienda.</p><ul><li><a href="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab" target="_blank" rel="noreferrer">Playera: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1556821840-3a63f95609a7" target="_blank" rel="noreferrer">Hoodie: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1551028719-00167b16eac5" target="_blank" rel="noreferrer">Chamarra: referencia fotográfica</a></li><li><a href="https://images.unsplash.com/photo-1542272604-787c3835535d" target="_blank" rel="noreferrer">Jeans: referencia fotográfica</a></li></ul><small>Tipografía: Barlow Condensed y DM Sans, distribuidas mediante Google Fonts.</small>'));
let orderText='';
function showOrder(){const t=totals(cart);const c=currentWelcome().coupon;const selected=currentUser()&&c?.id===appliedCouponId?welcomeDiscount(t.subtotal,c,now()):0;const discount=Math.max(t.discount,selected);orderText='LUXURY DROP · RESUMEN DE DEMOSTRACIÓN\n\n'+cart.map(l=>{const p=products.find(p=>p.id===l.id);return `${l.qty} × ${p.name} / Talla ${l.size} — ${money(l.qty*p.price)}`;}).join('\n')+`\n\nSubtotal: ${money(t.subtotal)}\nDescuento: ${money(discount)}\nTotal ilustrativo: ${money(Math.round((t.subtotal-discount)*100)/100)} MXN\n${selected>0&&selected>=t.discount?'Cupón de ejemplo: '+c.code+'\n':''}\nNo es un pedido. No se reserva ni canjea el cupón.`;info('<p class="eyebrow">SOLO PARA EXPLORAR</p><h2>Así se vería<br>tu selección.</h2><pre class="order-summary" id="order-text"></pre><button class="button gold" id="copy-order">Copiar resumen <span>↗</span></button><small>No se reserva inventario ni se registra una compra.</small>');$('#order-text').textContent=orderText;}
$('#info-content').addEventListener('click',async e=>{if(e.target.closest('#copy-order')){try{await navigator.clipboard.writeText(orderText);$('#copy-order').textContent='Resumen copiado ✓';}catch{$('#copy-order').textContent='Selecciona y copia el texto de arriba';}}});
window.addEventListener('ld:welcome-updated',()=>{if(!currentUser())appliedCouponId=null;renderCart();});
window.addEventListener('ld:apply-coupon',()=>{appliedCouponId=currentWelcome().coupon?.id||null;renderCart();openDialog('#cart-dialog');if(!cart.length)toast('Añade una prenda para previsualizar tu descuento.');});
renderProducts();renderCart();setupWelcome(toast);

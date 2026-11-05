import { products, campaign, totals, sanitizeCart, sizeName, sizeLabel } from './catalog.js';
import { setupWelcome,showWheel,showWelcome } from './welcome-ui.js';
import { setupAdmin } from './admin-ui.js';
import { currentWelcome,currentUser,now } from './welcome-service.js';
import { couponLabel,welcomePrizes,welcomeWeights } from './welcome-model.js';
import { storeConfig } from './store-config.js';
import { createOrderRequest,whatsappLink } from './order-request.js';
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
  $('#products').innerHTML=list.length?list.map(p=>`<article class="product"><div class="product-photo"><button data-product="${p.id}" aria-label="Ver ${p.name}"><img src="assets/${p.image}" alt="${p.name}, ${p.detail}" loading="lazy"></button><span class="product-tag">${p.tag}</span><button class="product-add" data-product="${p.id}" aria-label="Elegir talla de ${p.name}">+</button></div><div class="product-info"><div><button class="product-name" data-product="${p.id}">${p.name}</button><p>${p.detail}</p></div><span class="product-price">${money(p.price)}</span></div><div class="swatches"><i style="--swatch:${p.color}"></i><span>Tallas ${p.sizes.map(sizeName).join(' / ')} · ${p.fulfillment==='on-request'?'Bajo pedido':p.stock===1?'Última pieza':p.stock+' piezas'}</span></div></article>`).join(''):'<p class="no-results">No encontramos esa pieza. Prueba otra búsqueda o categoría.</p>';
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
  $('#product-detail').innerHTML=`<div class="product-detail-grid"><img src="assets/${p.image}" alt="${p.name}"><div class="detail-copy"><p class="eyebrow">DROP 01 / ${p.category.toUpperCase()}</p><h2>${p.name}</h2><p>${p.detail}</p><div class="detail-price">${money(p.price)} <small>MXN</small></div><span class="size-label" id="size-label">Elige tu talla</span><div class="sizes" role="group" aria-labelledby="size-label">${p.sizes.map(s=>`<button data-size="${s}" aria-pressed="false">${sizeLabel(s)}</button>`).join('')}</div><button id="add-cart" class="button gold" disabled>Selecciona una talla <span>+</span></button><p class="detail-note">${p.fulfillment==='on-request'?'Hasta '+p.stock+' piezas por modelo y pedido. Confirma disponibilidad y plazo de entrega por WhatsApp.':p.stock===1?'Una pieza disponible en talla '+p.sizes[0]+'.':p.stock+' piezas disponibles.'} El descuento de bienvenida se calcula sobre el total de prendas de tu primera compra.</p></div></div>`;
  openDialog('#product-dialog');
}
$('#product-detail').addEventListener('click',e=>{
  const b=e.target.closest('[data-size]');
  if(b){selectedSize=b.dataset.size;document.querySelectorAll('[data-size]').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',s===b);});$('#add-cart').disabled=false;$('#add-cart').innerHTML='Añadir a mi bolsa <span>+</span>';}
  if(e.target.closest('#add-cart')&&selectedSize){const p=selectedProduct;const used=cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0);if(used>=p.stock){toast(`Puedes solicitar hasta ${p.stock} piezas de este modelo por pedido.`);return;}const line=cart.find(l=>l.id===p.id&&l.size===selectedSize);if(line)line.qty++;else cart.push({id:p.id,size:selectedSize,qty:1});persist();$('#product-dialog').close();toast(`${p.name} se añadió a tu bolsa`);}
});
function renderCart(){
  $('#cart-count').textContent=count();$('#drawer-count').textContent=`(${count()})`;
  if(!cart.length){$('#cart-content').innerHTML='<div class="cart-empty"><h2>Tu próximo fit<br>empieza aquí.</h2><p>Aún no hay piezas en tu bolsa.<br>Explora el drop y elige tus favoritas.</p><button class="button gold" id="continue-shopping">Explorar el drop <span>↗</span></button></div>';return;}
  const t=totals(cart);const next=campaign.tiers.find(tier=>tier.min>t.subtotal);
  const coupon=currentWelcome().coupon;
  const request=createOrderRequest(cart,{coupon:currentUser()&&coupon?.id===appliedCouponId?coupon:null,now:now()});
  const {selected,discount,useWelcome}=request;
  const contactHref=whatsappLink(storeConfig.whatsappPhone,request.text);
  const couponInfo=selected?`<div class="coupon-applied"><strong>${couponLabel(coupon)} de bienvenida</strong>${useWelcome?'Incluido en el total estimado; sujeto a validación.':'Tu descuento por monto es mayor; conservamos el mejor ahorro.'}<br>Tu cupón se valida al confirmar la venta.<button id="remove-coupon">Quitar cupón</button></div>`:'<button id="cart-wheel" class="cart-coupon-invite">✳ Tu primer drop puede tener hasta 25% de descuento.<br>Consulta tu bienvenida y tus cupones ↗</button>';
  $('#cart-content').innerHTML=cart.map((l,i)=>{const p=products.find(p=>p.id===l.id);return `<article class="cart-line"><img src="assets/${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>Talla ${sizeLabel(l.size)}</p><div class="quantity"><button data-qty="-1" data-index="${i}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${l.qty}</span><button data-qty="1" data-index="${i}" aria-label="Agregar una unidad de ${p.name}">+</button></div></div><div class="line-end"><span>${money(p.price*l.qty)}</span><button class="remove" data-remove="${i}">Eliminar</button></div></article>`;}).join('')+`<div class="cart-progress"><p>${next?`Te faltan <strong>${money(next.min-t.subtotal)}</strong> para desbloquear ${Math.round(next.rate*100)}% de descuento.`:'<strong>¡Nivel máximo! Tienes 10% de descuento.</strong>'}</p><div class="progress-track"><span style="width:${Math.min(t.subtotal/2000*100,100)}%"></span></div><small>Promociones no acumulables: mostramos el mejor descuento.</small></div>${couponInfo}<div class="totals"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div class="discount"><span>${useWelcome?'Cupón de bienvenida':`Descuento ${Math.round(t.rate*100)}%`}</span><span>− ${money(discount)}</span></div><div class="total"><span>Total estimado</span><span>${money(Math.round((t.subtotal-discount)*100)/100)} <small>MXN</small></span></div></div><a class="button gold cart-action" id="order-whatsapp" href="${contactHref}" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp <span>↗</span></a><button class="cart-summary-link" id="order-preview">Ver y copiar mi pedido</button><p class="cart-disclaimer">Se abrirá WhatsApp con tu selección. Pulsa Enviar para solicitar tu pedido.<br>Confirmaremos disponibilidad, descuento y entrega por chat. Envío no incluido. El cupón sigue sin canjearse.</p>`;
}
$('#cart-open').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#cart-content').addEventListener('click',e=>{
  const qty=e.target.closest('[data-qty]');const remove=e.target.closest('[data-remove]');
  if(qty){const index=Number(qty.dataset.index);const line=cart[index];const p=products.find(p=>p.id===line.id);const delta=Number(qty.dataset.qty);if(delta>0&&cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0)>=p.stock){toast(`Puedes solicitar hasta ${p.stock} piezas de este modelo por pedido.`);return;}line.qty+=delta;if(line.qty<=0)cart.splice(index,1);persist();const equivalent=$(`#cart-content [data-index="${index}"][data-qty="${delta}"]`);(equivalent||$('#cart-dialog .close')).focus();}
  if(remove){cart.splice(Number(remove.dataset.remove),1);persist();$('#cart-dialog .close').focus();}
  if(e.target.closest('#continue-shopping')){$('#cart-dialog').close();$('#catalogo').scrollIntoView();}
  if(e.target.closest('#cart-wheel')){$('#cart-dialog').close();showWheel();}
  if(e.target.closest('#remove-coupon')){appliedCouponId=null;renderCart();}
  if(e.target.closest('#order-preview'))showOrder();
  const contact=e.target.closest('#order-whatsapp');
  if(contact){
    // Recheck time-sensitive totals at the actual click. Never open a stale
    // discount link if the coupon expired while the bag was left open.
    const fresh=currentOrder();
    if(contact.getAttribute('href')!==whatsappLink(storeConfig.whatsappPhone,fresh.text)){
      e.preventDefault();renderCart();toast('Actualizamos el descuento y el total. Revísalos antes de pedir.');
    }
  }
});
function info(content){$('#info-content').innerHTML=content;openDialog('#info-dialog');}
$('#terms-open').addEventListener('click',()=>info('<p class="eyebrow">LUXURY REWARDS / BIENVENIDA</p><h2>Tu primer drop,<br>con algo extra.</h2><ul><li>Un giro por cuenta con correo verificado y sin compras pagadas anteriores. No necesitas llenar la bolsa para girar.</li><li>Premios y probabilidades: '+welcomePrizes.map((percent,i)=>percent+'% de descuento ('+welcomeWeights[i]+'% de probabilidad)').join(', ')+'. Los segmentos de la ruleta son ilustrativos; las probabilidades no son iguales.</li><li>El cupón se guarda al girar en Perfil → Cupones y vence exactamente 24 horas después, aunque cierres la página o la animación.</li><li>Es personal, intransferible y de un solo uso en tu primera compra. No se puede repartir entre pedidos ni cambiar por efectivo. El porcentaje se aplica una sola vez al subtotal de todas las prendas de esa primera compra, sin tope en pesos. No incluye envío. El 25% no se convierte en 50% por comprar dos prendas: aumenta el ahorro en pesos al aumentar el subtotal. Redondeo al centavo sobre el subtotal completo.</li><li>No se acumula con descuentos por monto; se aplica el mayor ahorro. Un cupón vencido o utilizado no genera otro giro.</li><li>Los cupones anteriores de importe fijo conservan el valor y vencimiento con que se emitieron; no dan derecho a otro giro. Los perfiles de demostración y códigos LD-DEMO no son canjeables.</li></ul>'));
$('#credits-open').addEventListener('click',()=>info('<p class="eyebrow">LUXURY DROP / DROP 01</p><h2>Las piezas del drop.</h2><p>Logo e imágenes de producto proporcionados por Luxury Drop. Este catálogo presenta las tres playeras de DROP 01.</p><small>Tipografía: Barlow Condensed y DM Sans, distribuidas mediante Google Fonts.</small>'));
let orderText='';
function currentOrder(){
  const c=currentWelcome().coupon;
  return createOrderRequest(cart,{coupon:currentUser()&&c?.id===appliedCouponId?c:null,now:now()});
}
function showOrder(){
  orderText=currentOrder().text;
  info('<p class="eyebrow">TU PEDIDO / ATENCIÓN PERSONAL</p><h2>Tu selección,<br>lista para compartir.</h2><pre class="order-summary" id="order-text"></pre><button class="button gold" id="copy-order">Copiar mi pedido <span>↗</span></button><small>La disponibilidad y el descuento se confirman por WhatsApp. El cupón no se reserva ni se canjea al compartir el pedido.</small>');
  $('#order-text').textContent=orderText;
}
$('#info-content').addEventListener('click',async e=>{if(e.target.closest('#copy-order')){orderText=currentOrder().text;$('#order-text').textContent=orderText;try{await navigator.clipboard.writeText(orderText);$('#copy-order').textContent='Pedido copiado ✓';}catch{$('#copy-order').textContent='Selecciona y copia el texto de arriba';}}});
window.addEventListener('ld:welcome-updated',()=>{if(!currentUser())appliedCouponId=null;renderCart();});
window.addEventListener('ld:apply-coupon',()=>{appliedCouponId=currentWelcome().coupon?.id||null;renderCart();openDialog('#cart-dialog');if(!cart.length)toast('Añade una prenda para calcular tu descuento.');});
renderProducts();renderCart();setupWelcome(toast);setupAdmin({requestLogin:showWelcome,toast});

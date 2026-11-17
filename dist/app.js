import {revealProducts,animateSelection,captureProductFlight,flyToBag,setupStoreMotion} from './store-motion.js';
import {setupHeroMotion} from './hero-motion.js';
import { products, campaign, totals, sanitizeCart, sizeName, sizeLabel, salePrice } from './catalog.js';
import { setupWelcome,showWelcome } from './welcome-ui.js';
import { setupAdmin } from './admin-ui.js';
import { storeConfig } from './store-config.js';
import { createOrderRequest,whatsappLink } from './order-request.js';
const $ = s=>document.querySelector(s);
const money = n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2}).format(n);
let cart=[];try {cart=sanitizeCart(JSON.parse(localStorage.getItem('ld-cart-v1')||'[]'));}catch{}
let category='Todo', query='', selectedProduct=null, selectedSize=null;
const count = ()=>cart.reduce((n,l)=>n+l.qty,0);
function persist(){try{localStorage.setItem('ld-cart-v1',JSON.stringify(cart));}catch{} renderCart();}
let toastTimer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
function renderProducts(){
  let list=products.filter(p=>(category==='Todo'||p.category===category)&&`${p.name} ${p.category} ${p.detail} ${p.collection} ${p.material}`.toLocaleLowerCase('es-MX').includes(query));
  if($('#sort').value==='low') list.sort((a,b)=>salePrice(a)-salePrice(b));
  if($('#sort').value==='high') list.sort((a,b)=>salePrice(b)-salePrice(a));
  $('#products').innerHTML=list.length?list.map(p=>{const discounted=salePrice(p)<p.price,isAccessory=p.category!=='Playeras';return `<article class="product ${isAccessory?'is-accessory':''}" data-product-id="${p.id}"><div class="product-photo"><button data-product="${p.id}" aria-label="Ver ${p.name}"><img src="assets/${p.image}" alt="${p.name}, ${p.detail}" loading="lazy"></button><span class="product-tag">${discounted?'BLACK FRIDAY':p.tag}</span><button class="product-add" data-product="${p.id}" aria-label="${isAccessory?'Ver detalles':'Elegir talla'} de ${p.name}">+</button></div><div class="product-info"><div><button class="product-name" data-product="${p.id}">${p.name}</button><p>${p.detail}</p><small class="product-material">${p.material}</small></div><span class="product-price sale-price">${discounted?`<del aria-label="Precio anterior ${money(p.price)}">${money(p.price)}</del>`:''}<strong>${money(salePrice(p))}</strong><small>MXN</small></span></div><p class="product-saving">${discounted?`Ahorras ${money(p.price-salePrice(p))} · Descuento automático`:'Precio regular · Sin descuento'}</p><div class="swatches"><i style="--swatch:${p.color}"></i><span>${isAccessory?'Ajuste por confirmar':`Tallas ${p.sizes.map(sizeName).join(' / ')}`} · Bajo pedido</span></div></article>`;}).join(''):'<p class="no-results">No encontramos esa pieza. Prueba otra búsqueda o categoría.</p>';
  $('#results-status').textContent=`${list.length} productos encontrados`;
  revealProducts($('#products'));
}
$('#products').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)showProduct(b.dataset.product);});
document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;document.querySelectorAll('[data-category]').forEach(btn=>{const on=btn===b;btn.classList.toggle('selected',on);btn.setAttribute('aria-pressed',on);});renderProducts();}));
$('#sort').addEventListener('change',renderProducts);
$('#search-toggle').addEventListener('click',()=>{$('#search-box').hidden=false;$('#catalogo').scrollIntoView();$('#search').focus({preventScroll:true});});
$('#search').addEventListener('input',e=>{query=e.target.value.trim().toLocaleLowerCase('es-MX');renderProducts();});
$('#search-clear').addEventListener('click',()=>{$('#search').value='';query='';renderProducts();$('#search').focus();});
function productGallery(p){
  const images=p.images||[{src:p.image,label:'Vista principal'}];
  return `<div class="product-gallery"><div class="gallery-stage"><img id="product-main-image" src="assets/${images[0].src}" alt="${p.name} · ${images[0].label}" width="1254" height="1254"></div>${images.length>1?`<div class="gallery-thumbs" role="group" aria-label="Tomas de ${p.name}">${images.map((view,index)=>`<button type="button" data-view="${index}" aria-label="Ver ${view.label}" aria-pressed="${index===0}" class="${index===0?'selected':''}"><img src="assets/${view.src}" alt="" width="1254" height="1254"><span>${view.label}</span></button>`).join('')}</div><p class="gallery-caption" id="gallery-caption" aria-live="polite">${images[0].label} · 1 de ${images.length} tomas</p>`:''}</div>`;
}
function selectProductView(index){
  const views=selectedProduct?.images;if(!views?.[index])return;
  const view=views[index],image=$('#product-main-image');
  image.src=`assets/${view.src}`;image.alt=`${selectedProduct.name} · ${view.label}`;
  document.querySelectorAll('[data-view]').forEach(button=>{const selected=Number(button.dataset.view)===index;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});
  $('#gallery-caption').textContent=`${view.label} · ${index+1} de ${views.length} tomas`;
}
$('#product-detail').addEventListener('keydown',event=>{
  const button=event.target.closest('[data-view]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const last=selectedProduct.images.length-1;
  const index=event.key==='Home'?0:event.key==='End'?last:(Number(button.dataset.view)+(event.key==='ArrowRight'?1:last))%(last+1);
  selectProductView(index);$(`[data-view="${index}"]`).focus();
});
function showProduct(id){
  selectedProduct=products.find(p=>p.id===id);const p=selectedProduct;if(!p)return;
  const isAccessory=p.category!=='Playeras',discounted=salePrice(p)<p.price;
  selectedSize=isAccessory?'U':null;
  const sizePicker=isAccessory?'<p class="cap-fit-note">Confirma medida y ajuste por WhatsApp antes de comprar.</p>':`<div class="sizes" role="group" aria-labelledby="size-label">${p.sizes.map(size=>`<button data-size="${size}" aria-pressed="false">${sizeLabel(size)}</button>`).join('')}</div>`;
  $('#product-detail').innerHTML=`<div class="product-detail-grid ${isAccessory?'is-accessory':''}">${productGallery(p)}<div class="detail-copy"><p class="eyebrow">${discounted?'BLACK FRIDAY':p.tag} / ${p.collection.toUpperCase()}</p><h2>${p.name}</h2><p>${p.detail}</p><p class="product-composition"><strong>${p.material}</strong><span>${p.quality}</span></p><p class="product-description">${p.description}</p><ul class="product-features">${p.features.map(feature=>`<li>${feature}</li>`).join('')}</ul><div class="detail-price sale-price">${discounted?`<del>Antes ${money(p.price)}</del>`:''}<strong>${money(salePrice(p))}</strong> <small>MXN ${p.category==='Playeras'?'POR PLAYERA':p.category==='Gorras'?'POR GORRA':'POR PAR'}</small></div><p class="black-friday-note">${discounted?`Ahorras ${money(p.price-salePrice(p))}. El descuento Black Friday se aplica automáticamente, sin cuenta ni código.`:`Precio regular de ${money(p.price)} MXN. Este modelo no tiene descuento.`}</p><span class="size-label" id="size-label">${isAccessory?'Medida y ajuste':'Elige tu talla'}</span>${sizePicker}<button id="add-cart" class="button gold" ${isAccessory?'':'disabled'}>${isAccessory?'Añadir a mi bolsa':'Selecciona una talla'} <span>+</span></button><p class="detail-note">Hasta ${p.stock} piezas por modelo y pedido. Confirma disponibilidad y plazo de entrega por WhatsApp. Envío no incluido. No acumulable con otros descuentos.</p><p class="product-closing">${p.closing}</p></div></div>`;
  openDialog('#product-dialog');
}
$('#product-detail').addEventListener('click',e=>{
  const view=e.target.closest('[data-view]');if(view){selectProductView(Number(view.dataset.view));return;}
  const b=e.target.closest('[data-size]');
  if(b){animateSelection(b);selectedSize=b.dataset.size;document.querySelectorAll('[data-size]').forEach(s=>{s.classList.toggle('selected',s===b);s.setAttribute('aria-pressed',s===b);});$('#add-cart').disabled=false;$('#add-cart').innerHTML='Añadir a mi bolsa <span>+</span>';}
  if(e.target.closest('#add-cart')&&selectedSize){const p=selectedProduct;const used=cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0);if(used>=p.stock){toast(`Puedes solicitar hasta ${p.stock} piezas de este modelo por pedido.`);return;}const flight=captureProductFlight($('#product-detail img'),$('#add-cart'));const line=cart.find(l=>l.id===p.id&&l.size===selectedSize);if(line)line.qty++;else cart.push({id:p.id,size:selectedSize,qty:1});persist();$('#product-dialog').close();flyToBag(flight,count());toast(`${p.name} se añadió a tu bolsa`);}
});
function renderCart(){
  $('#cart-count').textContent=count();$('#drawer-count').textContent=`(${count()})`;
  if(!cart.length){$('#cart-content').innerHTML='<div class="cart-empty"><h2>Tu próximo fit<br>empieza aquí.</h2><p>BOSS, HUGO y Lacoste a $650 MXN por playera.<br>Gorras seleccionadas de $600 a $450 MXN; WES-TRN blanca $600.<br>Lentes de sol de $550 a $350 MXN.<br>El descuento Black Friday es automático.</p><button class="button gold" id="continue-shopping">Explorar el drop <span>↗</span></button></div>';return;}
  const t=totals(cart),request=createOrderRequest(cart);
  const contactHref=whatsappLink(storeConfig.whatsappPhone,request.text);
  $('#cart-content').innerHTML=cart.map((l,i)=>{const p=products.find(p=>p.id===l.id);return `<article class="cart-line"><img src="assets/${p.image}" alt="${p.name}"><div><h3>${p.name}</h3><p>${p.collection}</p><p>${p.category==='Playeras'?'Talla ':''}${sizeLabel(l.size)}</p><p class="line-sale">${money(salePrice(p))} MXN c/u · ${salePrice(p)<p.price?'Black Friday':'Precio regular'}</p><div class="quantity"><button data-qty="-1" data-index="${i}" aria-label="Quitar una unidad de ${p.name}">−</button><span>${l.qty}</span><button data-qty="1" data-index="${i}" aria-label="Agregar una unidad de ${p.name}">+</button></div></div><div class="line-end"><span>${money(salePrice(p)*l.qty)}</span><button class="remove" data-remove="${i}">Eliminar</button></div></article>`;}).join('')+`<div class="black-friday-cart"><strong>${t.discount?campaign.name+' aplicado':'Precio regular'}</strong><p>Playeras a $650, gorras señaladas a $450 y lentes de sol a $350 MXN. WES-TRN blanca a $600, sin descuento. Sin registro ni cupón.</p><small>No acumulable con otros descuentos.</small></div><div class="totals"><div><span>Subtotal antes de descuentos</span><span>${money(t.subtotal)}</span></div><div class="discount"><span>Descuento Black Friday</span><span>− ${money(t.discount)}</span></div><div class="total"><span>Total de productos</span><span><span id="cart-total-value"><span class="amount-current">${money(t.total)}</span></span> <small>MXN</small></span></div></div><a class="button gold cart-action" id="order-whatsapp" href="${contactHref}" target="_blank" rel="noopener noreferrer">Pedir por WhatsApp <span>↗</span></a><button class="cart-summary-link" id="order-preview">Ver y copiar mi pedido</button><p class="cart-disclaimer">Se abrirá WhatsApp con tu selección. Pulsa Enviar para solicitar tu pedido.<br>Confirmaremos disponibilidad y entrega por chat. Pago en efectivo o transferencia. Envío no incluido.</p>`;
}
$('#cart-open').addEventListener('click',()=>{renderCart();openDialog('#cart-dialog');});
$('#cart-content').addEventListener('click',e=>{
  const qty=e.target.closest('[data-qty]');const remove=e.target.closest('[data-remove]');
  if(qty){const index=Number(qty.dataset.index);const line=cart[index];const p=products.find(p=>p.id===line.id);const delta=Number(qty.dataset.qty);if(delta>0&&cart.filter(l=>l.id===p.id).reduce((n,l)=>n+l.qty,0)>=p.stock){toast(`Puedes solicitar hasta ${p.stock} piezas de este modelo por pedido.`);return;}line.qty+=delta;if(line.qty<=0)cart.splice(index,1);persist();const equivalent=$(`#cart-content [data-index="${index}"][data-qty="${delta}"]`);(equivalent||$('#cart-dialog .close')).focus();}
  if(remove){cart.splice(Number(remove.dataset.remove),1);persist();$('#cart-dialog .close').focus();}
  if(e.target.closest('#continue-shopping')){$('#cart-dialog').close();$('#catalogo').scrollIntoView();}
  if(e.target.closest('#order-preview'))showOrder();
  const contact=e.target.closest('#order-whatsapp');
  if(contact){
    // Recheck the inquiry at click time before handing it to WhatsApp.
    const fresh=currentOrder();
    if(contact.getAttribute('href')!==whatsappLink(storeConfig.whatsappPhone,fresh.text)){
      e.preventDefault();renderCart();toast('Actualizamos el descuento y el total. Revísalos antes de pedir.');
    }
  }
});
function info(content){$('#info-content').innerHTML=content;openDialog('#info-dialog');}
$('#terms-open').addEventListener('click',()=>info('<p class="eyebrow">BLACK FRIDAY / LUXURY DROP</p><h2>Tu siguiente drop,<br>con Black Friday.</h2><ul><li>BOSS, HUGO y Lacoste de Luxury Edition: precio anterior $1,499 MXN, descuento $849 MXN y precio final $650 MXN por playera.</li><li>El descuento se aplica automáticamente a cada pieza de la bolsa, sin registro ni cupón. Dos playeras cuestan $1,300 MXN y tres $1,950 MXN.</li><li>Gorras Champion, Uwharrie Roofing, HOWDY! y No Fear Be Brave: de $600 a $450 MXN cada una, ahorro $150. La gorra blanca WES-TRN Texas cuesta $600 MXN y no participa en el descuento.</li><li>Los cuatro modelos de lentes de sol: de $550 a $350 MXN por par, ahorro $200. Medida y ajuste por confirmar.</li><li>No acumulable con otros descuentos ni cupones anteriores. Los códigos ya emitidos conservan su registro en el perfil.</li><li>Playeras en Chica, Mediana y Grande. Medida y ajuste de gorras por confirmar. Hasta cinco piezas por modelo y pedido; disponibilidad y plazo de entrega por confirmar.</li><li>Pedidos por WhatsApp y pago en efectivo o transferencia por acordar. El envío no está incluido. Confirma disponibilidad antes de pagar.</li></ul>'));
$('#black-friday-info').addEventListener('click',()=>$('#terms-open').click());
$('#credits-open').addEventListener('click',()=>info('<p class="eyebrow">LUXURY DROP / DROP 01</p><h2>Las piezas del drop.</h2><p>Logo e imágenes de producto proporcionados por Luxury Drop: BOSS azul marino, HUGO negra, Lacoste verde, cinco modelos de gorras y cuatro modelos de lentes de sol. Las fotos de accesorios tienen el fondo retirado y encuadre uniforme. Los reflejos de los lentes se retocaron con iluminación neutra de estudio; los originales de lentes se conservan de forma privada.</p><small>Tipografía: Barlow Condensed y DM Sans, distribuidas mediante Google Fonts.</small>'));
let orderText='';
function currentOrder(){return createOrderRequest(cart);}
function showOrder(){
  orderText=currentOrder().text;
  info('<p class="eyebrow">TU PEDIDO / ATENCIÓN PERSONAL</p><h2>Tu selección,<br>lista para compartir.</h2><pre class="order-summary" id="order-text"></pre><button class="button gold" id="copy-order">Copiar mi pedido <span>↗</span></button><small>El descuento Black Friday ya está incluido. La disponibilidad y entrega se confirman por WhatsApp. Envío no incluido.</small>');
  $('#order-text').textContent=orderText;
}
$('#info-content').addEventListener('click',async e=>{if(e.target.closest('#copy-order')){orderText=currentOrder().text;$('#order-text').textContent=orderText;try{await navigator.clipboard.writeText(orderText);$('#copy-order').textContent='Pedido copiado ✓';}catch{$('#copy-order').textContent='Selecciona y copia el texto de arriba';}}});
document.querySelectorAll('[data-category] span').forEach(span=>{const category=span.closest('[data-category]').dataset.category;span.textContent=String(products.filter(p=>category==='Todo'||p.category===category).length).padStart(2,'0');});
setupStoreMotion();setupHeroMotion();renderProducts();persist();setupWelcome(toast);setupAdmin({requestLogin:showWelcome,toast});

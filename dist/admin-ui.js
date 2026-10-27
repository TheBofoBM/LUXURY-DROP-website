import * as service from './welcome-service.js';
import {countdown} from './welcome-model.js';
const $=s=>document.querySelector(s);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=cents=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(cents/100);
const date=value=>value?new Date(value).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}):'—';
let result=null,busy=false,searchSequence=0,clockOffset=0;
const labels={available:'Válido para canjear',expired:'Vencido',used:'Ya utilizado',reserved:'Reservado en un pedido',voided:'Anulado',ineligible:'Ya realizó su primera compra'};
function access(){
  const admin=service.currentAdmin();
  $('#admin-workspace').hidden=!admin;$('#admin-access').hidden=admin;
  $('#admin-session').textContent=service.currentUser()?.email||'Sin sesión iniciada';
  $('#admin-preview').hidden=!service.isPreview;$('#admin-login').hidden=service.isPreview||Boolean(service.currentUser());
  $('#admin-access-message').textContent=service.isPreview?'Explora un administrador de ejemplo. Los códigos y canjes de esta prueba no tienen valor comercial.':service.currentUser()?'Esta cuenta no tiene permisos de administrador. El propietario debe habilitarla de forma privada.':'Accede con tu cuenta de administrador. Las cuentas de cliente no pueden validar ni canjear códigos.';
  $('#admin-preview-notice').hidden=!service.isPreview;$('#admin-examples').hidden=!service.isPreview;
  if(!admin){result=null;$('#admin-result').innerHTML='';$('#admin-sales').innerHTML='';$('#admin-redeem').hidden=true;$('#admin-action-status').textContent='';}
}
async function history(){
  try{const {sales}=await service.adminSales();if(!service.currentAdmin())return;
    $('#admin-sales').innerHTML=sales.length?sales.map(s=>`<article class="admin-sale"><div><strong>${money(s.discount_cents)} de descuento</strong><span>${s.method==='cash'?'Efectivo':'Transferencia'}</span></div><p>${escape(s.customer_email)}</p><code>${escape(s.code)}</code><p>Cobro registrado: <strong>${money(s.collected_cents)}</strong></p><small>${escape(date(s.recorded_at))} · CDMX<br>${escape(s.recorded_by||'Administrador')}${s.reference?'<br>Folio: '+escape(s.reference):''}</small></article>`).join(''):'<p class="admin-empty">Aquí aparecerán los cupones que marques como utilizados.</p>';
  }catch{$('#admin-sales').textContent='No pudimos cargar el historial. Intenta actualizarlo.';}
}
function renderResult(){
  $('#admin-redeem').hidden=true;
  if(!result?.found){$('#admin-result').innerHTML='<div class="admin-verdict invalid"><strong>Código no encontrado</strong><p>Revisa que esté completo y que corresponda a Luxury Drop.</p></div>';return;}
  const c=result.coupon;const status=result.status;const valid=result.can_redeem;
  $('#admin-result').innerHTML=`<article class="admin-verdict ${valid?'valid':'invalid'}"><div class="admin-verdict-head"><strong>${labels[status]||'No disponible'}</strong><span>${money(c.amount_cents)}</span></div><code>${escape(c.code)}</code><dl><div><dt>Cliente</dt><dd>${escape(result.customer_email||'Cuenta sin correo')}</dd></div><div><dt>Vigencia hasta</dt><dd>${escape(date(c.expires_at))} · CDMX</dd></div>${valid?'<div><dt>Tiempo restante</dt><dd id="admin-countdown">'+countdown(c.expires_at,Date.now()+clockOffset)+'</dd></div>':''}</dl>${result.sale?`<p class="admin-used-detail">Canje registrado el ${escape(date(result.sale.recorded_at))}.<br>Descuento aplicado: <strong>${money(result.sale.discount_cents)}</strong> · ${result.sale.method==='cash'?'Efectivo':result.sale.method==='transfer'?'Transferencia':'Venta registrada'}${result.sale.reference?'<br>Folio: '+escape(result.sale.reference):''}</p>`:''}</article>`;
  $('#admin-redeem').hidden=!valid;calculation();
}
function calculation(){
  const amount=Number($('#admin-subtotal').value);const subtotal=Math.round(amount*100);
  if(!result?.can_redeem||!$('#admin-subtotal').value||!Number.isFinite(amount)||subtotal<=0){$('#admin-calculation').textContent='Introduce el importe para calcular el descuento y el total.';return;}
  const discount=Math.min(subtotal,result.coupon.amount_cents);
  $('#admin-calculation').innerHTML=`<div><span>Productos</span><strong>${money(subtotal)}</strong></div><div><span>Descuento aplicable</span><strong>− ${money(discount)}</strong></div><div><span>Total acordado con el cliente</span><strong>${money(subtotal-discount)}</strong></div>`;
}
async function lookup(code){
  if(busy||!service.currentAdmin())return;const sequence=++searchSequence;
  $('#admin-search-submit').disabled=true;$('#admin-search-status').textContent='Consultando vigencia y estado…';$('#admin-action-status').textContent='';$('#admin-redeem').hidden=true;
  try{const data=await service.adminLookup(code);if(sequence!==searchSequence||!service.currentAdmin())return;result=data;clockOffset=data.server_now?Date.parse(data.server_now)-Date.now():0;$('#admin-confirm').checked=false;$('#admin-search-status').textContent='';renderResult();}
  catch(error){if(sequence===searchSequence&&service.currentAdmin()){result=null;$('#admin-result').innerHTML='';$('#admin-search-status').textContent=service.errorMessage(error);}}
  finally{if(sequence===searchSequence)$('#admin-search-submit').disabled=false;}
}
function requestId(payload){
  let saved;try{saved=JSON.parse(sessionStorage.getItem('ld-manual-attempt')||'null');}catch{}
  const signature=JSON.stringify({...payload,user:service.currentUser()?.id});
  if(saved?.signature===signature)return saved.id;
  const id=crypto.randomUUID();try{sessionStorage.setItem('ld-manual-attempt',JSON.stringify({signature,id}));}catch{}return id;
}
export function setupAdmin({requestLogin,toast}){
  async function open(){
    try{sessionStorage.removeItem('ld-admin-intent');}catch{}
    access();for(const d of document.querySelectorAll('dialog[open]'))if(d.id!=='admin-dialog')d.close();
    if(!$('#admin-dialog').open)$('#admin-dialog').showModal();if(service.currentAdmin())await history();
  }
  $('#admin-open').addEventListener('click',open);$('#profile-admin-open').addEventListener('click',open);
  window.addEventListener('ld:admin-authenticated',open);
  window.addEventListener('ld:welcome-updated',access);
  $('#admin-login').addEventListener('click',()=>{try{sessionStorage.setItem('ld-admin-intent','1');}catch{}$('#admin-dialog').close();requestLogin();});
  $('#admin-preview').addEventListener('click',async()=>{try{await service.previewAdminSignIn();await open();}catch(error){$('#admin-access-message').textContent=service.errorMessage(error);}});
  $('#admin-search').addEventListener('submit',e=>{e.preventDefault();lookup($('#admin-code').value.trim().toUpperCase());});
  $('#admin-examples').addEventListener('click',e=>{const b=e.target.closest('[data-example]');if(b){$('#admin-code').value=b.dataset.example;lookup(b.dataset.example);}});
  $('#admin-new-example').addEventListener('click',()=>{if(!service.isPreview||busy)return;const code=service.createAdminExample();$('#admin-code').value=code;lookup(code);});
  $('#admin-subtotal').addEventListener('input',calculation);$('#admin-refresh-history').addEventListener('click',history);
  $('#admin-redeem').addEventListener('submit',async e=>{
    e.preventDefault();if(busy||!result?.can_redeem||!service.currentAdmin())return;
    if(Date.parse(result.coupon.expires_at)<=Date.now()+clockOffset){result.status='expired';result.can_redeem=false;renderResult();return;}
    const payload={code:result.coupon.code,subtotal:Math.round(Number($('#admin-subtotal').value)*100),method:$('#admin-method').value,reference:$('#admin-reference').value.trim()};
    busy=true;$('#admin-redeem-submit').disabled=true;$('#admin-search-submit').disabled=true;$('#admin-action-status').textContent='Registrando el canje…';
    try{const data=await service.adminRedeem({...payload,requestId:requestId(payload)});if(!service.currentAdmin())return;result=data;renderResult();$('#admin-action-status').textContent=service.isPreview?'Canje de prueba registrado. Este código ya no puede usarse en la demostración.':'Canje confirmado. El cupón quedó utilizado y no puede aplicarse de nuevo.';toast('Cupón marcado como utilizado.');await history();}
    catch(error){$('#admin-action-status').textContent=service.errorMessage(error)+' Vuelve a consultar el código antes de aplicar otro descuento.';try{result=await service.adminLookup(payload.code);renderResult();}catch{}}
    finally{busy=false;$('#admin-redeem-submit').disabled=false;$('#admin-search-submit').disabled=false;}
  });
  setInterval(()=>{if(!$('#admin-dialog').open||!result?.can_redeem)return;const left=Date.parse(result.coupon.expires_at)-(Date.now()+clockOffset);if(left<=0){result.status='expired';result.can_redeem=false;renderResult();}else if($('#admin-countdown'))$('#admin-countdown').textContent=countdown(result.coupon.expires_at,Date.now()+clockOffset);},1000);
  access();
}

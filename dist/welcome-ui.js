import * as service from './welcome-service.js';
import {couponStatus,countdown,couponLabel} from './welcome-model.js';
const $=s=>document.querySelector(s);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let authBusy=false,notify=()=>{},authEmail='';
function dialog(id){const d=$(id);if(!d.open)d.showModal();}
function close(id){$(id).close();}
function currentStatus(){return couponStatus(service.currentWelcome().coupon,service.now());}
export function showWelcome(){
  if(service.currentUser()){showProfile();return;}
  dialog('#welcome-dialog');
}

export async function showProfile(){
  if(!service.currentUser()){showWelcome();return;}
  $('#coupons-tab').click();renderProfile();dialog('#profile-dialog');
  try{await service.refreshWelcome();}catch{ $('#profile-status').textContent='No pudimos actualizar tus cupones. Intenta de nuevo.'; }
}

function renderProfile(){
  const c=service.currentWelcome().coupon;const status=currentStatus();const user=service.currentUser();
  $('#profile-identity').textContent=user?.email||'Mi cuenta Luxury Drop';
  $('#profile-admin-open').hidden=!service.currentAdmin();
  $('#account-mode').textContent=service.isPreview?'Perfil de prueba guardado solo en este navegador. No es una cuenta real y sus cupones no se pueden canjear.':'Tu sesión está activa. Black Friday se aplica sin códigos; aquí puedes consultar tus cupones anteriores.';
  $('#coupon-count').textContent=status==='available'?'1':'0';
  $('.profile-notice').hidden=status!=='available';
  if(!c){$('#profile-coupons').innerHTML='<div class="coupon-empty"><span aria-hidden="true">✳</span><h3>Black Friday, sin códigos.</h3><p>El precio de $650 MXN por playera se aplica automáticamente en la bolsa. No necesitas un cupón.</p><a href="#catalogo" class="button gold" id="profile-catalog">Ver las playeras <span>↗</span></a></div>';return;}

  const labels={available:'Disponible',expired:'Vencido',reserved:'Reservado en un pedido',used:'Utilizado',voided:'Ya no aplica a tu primera compra'};
  const usable=status==='available';
  const date=new Date(c.expires_at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'});
  $('#profile-coupons').innerHTML=`<p class="coupon-section-note">TU BIENVENIDA, GUARDADA AQUÍ.</p><article class="coupon-card ${usable?'':'coupon-inactive'}"><div class="coupon-card-head"><span>PRIMER DROP / BIENVENIDA</span><span class="coupon-badge">${labels[status]||'No disponible'}</span></div><div class="coupon-value">−${c.discount_percent!=null?escape(couponLabel(c)):escape(couponLabel(c).replace(' MXN',''))+'<small>MXN</small>'}</div><p class="coupon-purpose">${c.discount_percent!=null?'Sobre el total de prendas de tu primera compra, sin tope en pesos.':'Importe fijo emitido en la promoción anterior.'} Solo para ti.</p><div class="coupon-cut" aria-hidden="true"></div><p class="coupon-code-label">TU CÓDIGO ${service.isPreview?'DE EJEMPLO':'PERSONAL'}</p><div class="coupon-code-row"><code>${escape(c.code)}</code><button id="copy-coupon" aria-label="Copiar código del cupón">Copiar</button></div><div class="coupon-expiry"><span>${usable?'Vence en':status==='reserved'?'Reservado; vigencia original':'Estado del cupón'}</span><strong id="coupon-countdown">${usable?countdown(c.expires_at,service.now()):labels[status]}</strong></div><p class="coupon-date">Vigencia hasta ${escape(date)} · hora de Ciudad de México</p></article><p class="black-friday-note">Tu código anterior permanece guardado. No se acumula con el precio Black Friday de $650 MXN por playera.</p><p class="coupon-footer">${service.isPreview?'CUPÓN DE DEMOSTRACIÓN · No es canjeable.':'Personal e intransferible. Un solo uso. No acumulable con otras promociones.'}</p><button id="refresh-coupons" class="auth-secondary">Actualizar mis cupones</button>`;
}
function updated(){
  renderProfile();
  window.dispatchEvent(new CustomEvent('ld:welcome-updated'));
}
async function authenticated(){close('#welcome-dialog');authEmail='';$('#email-form').hidden=false;$('#otp-form').hidden=true;$('#magiclink-panel').hidden=true;$('#auth-status').textContent='';let adminIntent=false;try{adminIntent=sessionStorage.getItem('ld-admin-intent')==='1';}catch{}if(adminIntent){window.dispatchEvent(new CustomEvent('ld:admin-authenticated'));return;}showProfile();}
async function authTask(task){if(authBusy)return;authBusy=true;document.querySelectorAll('#auth-live button,#preview-signin').forEach(b=>b.disabled=true);try{await task();}catch(error){$('#auth-status').textContent=service.errorMessage(error);}finally{authBusy=false;document.querySelectorAll('#auth-live button,#preview-signin').forEach(b=>b.disabled=false);}}
export async function setupWelcome(toast){
  notify=toast;
  $('#auth-preview').hidden=!service.isPreview;$('#auth-live').hidden=service.isPreview;$('#google-signin').hidden=!service.hasGoogle;
  $('#google-access-note').hidden=!service.hasGoogle;
  $('#email-alternative').hidden=!service.hasGoogle;
  $('#email-access').hidden=service.hasGoogle;
  $('#email-alternative').addEventListener('click',()=>{
    const expand=$('#email-access').hidden;
    $('#email-access').hidden=!expand;
    $('#email-alternative').setAttribute('aria-expanded',String(expand));
    $('#email-alternative').textContent=expand?'Ocultar acceso por correo':'Prefiero usar mi correo';
    if(expand&&!$('#email-form').hidden)$('#welcome-email').focus();
  });
  if(service.emailMode==='magiclink')$('#email-submit').innerHTML='Recibir enlace de acceso <span>↗</span>';
  $('#email-delivery-note').hidden=service.emailDelivery!=='team-only';
  ['profile-open'].forEach(id=>$('#'+id).addEventListener('click',showWelcome));
  $('#welcome-later').addEventListener('click',()=>close('#welcome-dialog'));
  $('#welcome-terms').addEventListener('click',()=>$('#terms-open').click());
  $('#preview-signin').addEventListener('click',()=>authTask(async()=>{await service.previewSignIn();await authenticated();}));
  $('#google-signin').addEventListener('click',()=>authTask(async()=>{try{sessionStorage.setItem('ld-auth-intent','profile');}catch{}await service.googleSignIn();}));
  $('#email-form').addEventListener('submit',e=>{e.preventDefault();authTask(async()=>{authEmail=$('#welcome-email').value.trim();await service.sendEmail(authEmail);$('#email-form').hidden=true;const link=service.emailMode==='magiclink';$('#otp-form').hidden=link;$('#magiclink-panel').hidden=!link;if(link){$('#magiclink-email').textContent=authEmail;$('#auth-status').textContent='Revisa tu correo y abre el enlace con este mismo navegador.';}else{$('#auth-status').textContent='Te enviamos un código. Revisa también tu carpeta de spam.';$('#welcome-otp').focus();}});});
  $('#otp-form').addEventListener('submit',e=>{e.preventDefault();authTask(async()=>{await service.verifyEmail(authEmail,$('#welcome-otp').value.trim());await authenticated();});});
  function changeEmail(){$('#email-form').hidden=false;$('#otp-form').hidden=true;$('#magiclink-panel').hidden=true;$('#welcome-otp').value='';$('#auth-status').textContent='';$('#welcome-email').focus();}
  $('#email-change').addEventListener('click',changeEmail);$('#magiclink-change').addEventListener('click',changeEmail);
  $('#welcome-dialog').addEventListener('close',()=>{try{sessionStorage.setItem('ld-welcome-seen-v2','1');}catch{}});
  $('#profile-coupons').addEventListener('click',async e=>{
    if(e.target.closest('#profile-catalog'))close('#profile-dialog');
    if(e.target.closest('#copy-coupon')){const c=service.currentWelcome().coupon;try{await navigator.clipboard.writeText(c.code);notify('Código copiado.');}catch{notify('Selecciona el código para copiarlo.');}}
    if(e.target.closest('#refresh-coupons')){try{await service.refreshWelcome();$('#profile-status').textContent='Cupones actualizados.';}catch{$('#profile-status').textContent='No pudimos actualizar tus cupones.';}}
  });
  $('#signout').addEventListener('click',async()=>{try{await service.signOut();close('#profile-dialog');notify('Sesión cerrada.');}catch{notify('No pudimos cerrar la sesión. Intenta nuevamente.');}});
  const tabs=[$('#coupons-tab'),$('#account-tab')];
  function activateTab(index){tabs.forEach((t,i)=>{t.setAttribute('aria-selected',i===index);t.tabIndex=i===index?0:-1;$('#'+t.getAttribute('aria-controls')).hidden=i!==index;});}
  tabs.forEach((t,i)=>{t.addEventListener('click',()=>activateTab(i));t.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?1:1-i;activateTab(n);tabs[n].focus();}});});
  let previousStatus='none';setInterval(()=>{const c=service.currentWelcome().coupon;const status=currentStatus();if($('#coupon-countdown')&&status==='available')$('#coupon-countdown').textContent=countdown(c.expires_at,service.now());if(status!==previousStatus){previousStatus=status;updated();}},1000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&service.currentUser())service.refreshWelcome().catch(()=>{});});
  try{
    await service.initializeWelcome(updated);
    let intent=null;try{intent=sessionStorage.getItem('ld-auth-intent');sessionStorage.removeItem('ld-auth-intent');}catch{}
    let adminIntent=false;try{adminIntent=sessionStorage.getItem('ld-admin-intent')==='1';}catch{}
    if(adminIntent&&service.currentUser())window.dispatchEvent(new CustomEvent('ld:admin-authenticated'));
    else if(intent&&service.currentUser())showProfile();
  }catch{$('#auth-status').textContent='El acceso no está disponible temporalmente. Inténtalo más tarde.';$('#auth-live').hidden=true;}
}

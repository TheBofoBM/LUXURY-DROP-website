import * as service from './welcome-service.js';
import {welcomePrizes,couponStatus,countdown} from './welcome-model.js';
const $=s=>document.querySelector(s);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const price=cents=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(cents/100);
let spinning=false,authBusy=false,notify=()=>{},authEmail='',rotation=0;
function dialog(id){const d=$(id);if(!d.open)d.showModal();}
function close(id){$(id).close();}
function currentStatus(){return couponStatus(service.currentWelcome().coupon,service.now());}
export function showWelcome(){
  if(service.currentUser()){showProfile();return;}
  dialog('#welcome-dialog');
}
export function showWheel(){
  if(!service.currentUser()){showWelcome();return;}
  close('#welcome-dialog');renderWheel();dialog('#wheel-dialog');
}
export async function showProfile(){
  if(!service.currentUser()){showWelcome();return;}
  close('#wheel-dialog');$('#coupons-tab').click();renderProfile();dialog('#profile-dialog');
  try{await service.refreshWelcome();}catch{ $('#profile-status').textContent='No pudimos actualizar tus cupones. Intenta de nuevo.'; }
}
function renderWheel(){
  const state=service.currentWelcome();const status=currentStatus();const c=state.coupon;
  $('#spin').disabled=spinning||!service.currentUser()||!state.eligible;
  $('#wheel-coupons').hidden=!c||spinning;
  $('#wheel-status').textContent=service.isPreview?'Vista previa · Este giro genera un cupón de ejemplo, sin valor de canje.':c?'Tu premio ya está guardado en Perfil → Cupones.':'Tu cuenta ya está lista. Descubre qué descuento te llevas.';
  if(!spinning)$('#wheel-result').textContent=c?(status==='expired'?'Tu cupón de bienvenida ha vencido.':`Tu descuento: ${price(c.amount_cents)} MXN`):!state.eligible?'Esta bienvenida es exclusiva para tu primera compra.':'';
}
function renderProfile(){
  const c=service.currentWelcome().coupon;const status=currentStatus();const user=service.currentUser();
  $('#profile-identity').textContent=user?.email||'Mi cuenta Luxury Drop';
  $('#profile-admin-open').hidden=!service.currentAdmin();
  $('#account-mode').textContent=service.isPreview?'Perfil de prueba guardado solo en este navegador. No es una cuenta real y sus cupones no se pueden canjear.':'Tu cuenta y tus cupones se guardan de forma segura. Tu sesión está activa.';
  $('#coupon-count').textContent=status==='available'?'1':'0';
  $('.profile-notice').hidden=status!=='available';
  if(!c){$('#profile-coupons').innerHTML=`<div class="coupon-empty"><span aria-hidden="true">✳</span><h3>${service.currentWelcome().eligible?'Tu primer descuento te espera.':'Gracias por ser parte del drop.'}</h3><p>${service.currentWelcome().eligible?'Gira una vez y guarda hasta $400 MXN para tu primera compra.':'La ruleta de bienvenida está disponible antes de tu primera compra.'}</p>${service.currentWelcome().eligible?'<button id="profile-spin" class="button gold">Descubrir mi premio <span>↗</span></button>':''}</div>`;return;}
  const labels={available:'Disponible',expired:'Vencido',reserved:'Reservado en un pedido',used:'Utilizado',voided:'Ya no aplica a tu primera compra'};
  const usable=status==='available';
  const date=new Date(c.expires_at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'});
  $('#profile-coupons').innerHTML=`<p class="coupon-section-note">TU BIENVENIDA, GUARDADA AQUÍ.</p><article class="coupon-card ${usable?'':'coupon-inactive'}"><div class="coupon-card-head"><span>PRIMER DROP / BIENVENIDA</span><span class="coupon-badge">${labels[status]||'No disponible'}</span></div><div class="coupon-value">−${price(c.amount_cents)}<small>MXN</small></div><p class="coupon-purpose">Para tu primera compra. Solo para ti.</p><div class="coupon-cut" aria-hidden="true"></div><p class="coupon-code-label">TU CÓDIGO ${service.isPreview?'DE EJEMPLO':'PERSONAL'}</p><div class="coupon-code-row"><code>${escape(c.code)}</code><button id="copy-coupon" aria-label="Copiar código del cupón">Copiar</button></div><div class="coupon-expiry"><span>${usable?'Vence en':status==='reserved'?'Reservado; vigencia original':'Estado del cupón'}</span><strong id="coupon-countdown">${usable?countdown(c.expires_at,service.now()):labels[status]}</strong></div><p class="coupon-date">Vigencia hasta ${escape(date)} · hora de Ciudad de México</p></article>${usable?'<button id="use-coupon" class="button gold coupon-use">Ver descuento en mi bolsa <span>↗</span></button>':''}<p class="coupon-footer">${service.isPreview?'CUPÓN DE DEMOSTRACIÓN · No es canjeable.':'Personal e intransferible. Un solo uso. No acumulable con otras promociones.'}</p><button id="refresh-coupons" class="auth-secondary">Actualizar mis cupones</button>`;
}
function updated(){
  renderProfile();renderWheel();
  window.dispatchEvent(new CustomEvent('ld:welcome-updated'));
}
async function authenticated(){close('#welcome-dialog');authEmail='';$('#email-form').hidden=false;$('#otp-form').hidden=true;$('#auth-status').textContent='';let adminIntent=false;try{adminIntent=sessionStorage.getItem('ld-admin-intent')==='1';}catch{}if(adminIntent){window.dispatchEvent(new CustomEvent('ld:admin-authenticated'));return;}showWheel();}
async function authTask(task){if(authBusy)return;authBusy=true;document.querySelectorAll('#auth-live button,#preview-signin').forEach(b=>b.disabled=true);try{await task();}catch(error){$('#auth-status').textContent=service.errorMessage(error);}finally{authBusy=false;document.querySelectorAll('#auth-live button,#preview-signin').forEach(b=>b.disabled=false);}}
export async function setupWelcome(toast){
  notify=toast;
  $('#auth-preview').hidden=!service.isPreview;$('#auth-live').hidden=service.isPreview;$('#google-signin').hidden=!service.hasGoogle;
  ['welcome-banner','rewards-register','profile-open'].forEach(id=>$('#'+id).addEventListener('click',showWelcome));
  $('#wheel-open').addEventListener('click',showWheel);
  $('#wheel-coupons').addEventListener('click',showProfile);
  $('#welcome-later').addEventListener('click',()=>close('#welcome-dialog'));
  $('#welcome-terms').addEventListener('click',()=>$('#terms-open').click());
  $('#preview-signin').addEventListener('click',()=>authTask(async()=>{await service.previewSignIn();await authenticated();}));
  $('#google-signin').addEventListener('click',()=>authTask(async()=>{try{sessionStorage.setItem('ld-auth-intent','spin');}catch{}await service.googleSignIn();}));
  $('#email-form').addEventListener('submit',e=>{e.preventDefault();authTask(async()=>{authEmail=$('#welcome-email').value.trim();await service.sendEmail(authEmail);$('#email-form').hidden=true;$('#otp-form').hidden=false;$('#auth-status').textContent='Te enviamos un código. Revisa también tu carpeta de spam.';$('#welcome-otp').focus();});});
  $('#otp-form').addEventListener('submit',e=>{e.preventDefault();authTask(async()=>{await service.verifyEmail(authEmail,$('#welcome-otp').value.trim());await authenticated();});});
  $('#email-change').addEventListener('click',()=>{$('#email-form').hidden=false;$('#otp-form').hidden=true;$('#welcome-otp').value='';$('#auth-status').textContent='';$('#welcome-email').focus();});
  $('#welcome-dialog').addEventListener('close',()=>{try{sessionStorage.setItem('ld-welcome-seen-v2','1');}catch{}});
  $('#spin').addEventListener('click',async()=>{
    if(spinning||!service.currentUser()||!service.currentWelcome().eligible)return;
    spinning=true;$('#spin').disabled=true;$('#wheel-result').textContent='Guardando tu premio…';
    try{
      const coupon=await service.claimCoupon();const index=welcomePrizes.indexOf(coupon.amount_cents/100);
      rotation+=2160+360-(index*60+30);$('#wheel').style.transform=`rotate(${rotation}deg)`;
      const done=()=>{spinning=false;renderWheel();notify(`Tu cupón de ${price(coupon.amount_cents)} está en Perfil → Cupones`);};
      if(matchMedia('(prefers-reduced-motion: reduce)').matches)done();else setTimeout(done,3550);
    }catch(error){spinning=false;renderWheel();$('#wheel-result').textContent=service.errorMessage(error);}
  });
  $('#profile-coupons').addEventListener('click',async e=>{
    if(e.target.closest('#profile-spin')){close('#profile-dialog');showWheel();}
    if(e.target.closest('#copy-coupon')){const c=service.currentWelcome().coupon;try{await navigator.clipboard.writeText(c.code);notify('Código copiado.');}catch{notify('Selecciona el código para copiarlo.');}}
    if(e.target.closest('#use-coupon')){if(currentStatus()!=='available'){renderProfile();return;}close('#profile-dialog');window.dispatchEvent(new CustomEvent('ld:apply-coupon'));}
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
    else if(intent&&service.currentUser())showWheel();
    else if(!service.currentUser()){let seen=false;try{seen=sessionStorage.getItem('ld-welcome-seen-v2')==='1';}catch{}if(!seen)setTimeout(()=>{if(!document.querySelector('dialog[open]')&&!service.currentUser())showWelcome();},1200);}
  }catch{$('#auth-status').textContent='El acceso no está disponible temporalmente. Inténtalo más tarde.';$('#auth-live').hidden=true;}
}

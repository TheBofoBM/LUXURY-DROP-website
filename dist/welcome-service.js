import {authConfig} from './config.js';
import {choosePrize,welcomeDuration,welcomePrizes,couponDiscountCents} from './welcome-model.js';

const configured=Boolean(authConfig.supabaseUrl&&authConfig.supabasePublishableKey);
const storeKey='ld-welcome-preview-v1';
let client=null,user=null,offset=0,accountState={coupon:null,eligible:true},listener=()=>{},previewSignedIn=false,admin=false;
export const isPreview=!configured;
export const hasGoogle=configured&&authConfig.googleEnabled;
export const emailMode=authConfig.emailMode==='otp'?'otp':'magiclink';
export const emailDelivery=authConfig.emailDelivery||'team-only';
export const now=()=>Date.now()+offset;
export const currentUser=()=>user;
export const currentAdmin=()=>Boolean(user&&admin);
export const currentWelcome=()=>accountState;
function previewRead(){try{return JSON.parse(localStorage.getItem(storeKey)||'null');}catch{return null;}}
function previewState(){const saved=previewRead();const c=saved?.coupon;const valid=c&&typeof c.code==='string'&&Number.isFinite(Date.parse(c.expires_at))&&(c.discount_percent!=null?welcomePrizes.includes(c.discount_percent):[5000,10000,15000,20000,30000,40000].includes(c.amount_cents));return {coupon:valid?c:null,eligible:!valid};}
function setState(data){accountState={coupon:data.coupon||null,eligible:!!data.eligible};if(data.server_now)offset=Date.parse(data.server_now)-Date.now();listener();}
export function errorMessage(error) {
  const text=error?.message||'';
  if(error?.code==='email_address_not_authorized'||text.toLowerCase().includes('email address not authorized'))return 'El envío de correo todavía está limitado al equipo de la tienda. El registro público está en preparación.';
  if(error?.code==='over_email_send_rate_limit')return 'Se alcanzó el límite temporal de correos de prueba. Espera antes de solicitar otro enlace.';
  if(text.includes('FIRST_PURCHASE_ONLY'))return 'Esta promoción es exclusiva para cuentas sin compras anteriores.';
  if(text.includes('VERIFIED_EMAIL_REQUIRED'))return 'Confirma tu correo antes de girar.';
  if(text.includes('ADMIN_REQUIRED'))return 'Esta cuenta no tiene permisos de administrador.';
  if(text.includes('COUPON_ALREADY_USED'))return 'Este cupón ya fue utilizado. No apliques otro descuento.';
  if(text.includes('COUPON_EXPIRED'))return 'Este cupón ya venció. No es válido para canjear.';
  if(text.includes('COUPON_UNAVAILABLE'))return 'El cupón no está disponible; puede estar reservado o anulado.';
  if(text.includes('COUPON_NOT_FOUND'))return 'No encontramos ese código.';
  if(text.includes('REQUEST_CONFLICT'))return 'La solicitud ya se registró con otros datos. Actualiza la consulta.';
  if(text.includes('INVALID_SALE'))return 'Revisa el importe de la venta y la forma de pago.';
  if(text.includes('rate limit')||error?.status===429)return 'Espera un momento antes de volver a intentarlo.';
  if(text.includes('Email link is invalid')||text.includes('Token has expired'))return 'El código venció o no es correcto. Solicita uno nuevo.';
  return 'No pudimos completar la solicitud. Revisa tu conexión y vuelve a intentarlo.';
}
export async function refreshWelcome() {
  if(!user){admin=false;setState({coupon:null,eligible:true});return;}
  if(isPreview){setState(admin?{coupon:null,eligible:false}:previewState());return;}
  const id=user.id;
  const [welcome,permission]=await Promise.all([client.rpc('ld_welcome_state'),client.rpc('ld_is_admin')]);
  if(user?.id!==id)return;
  admin=!permission.error&&permission.data===true;
  if(welcome.error)throw welcome.error;setState(welcome.data);
}
export async function initializeWelcome(onChange) {
  listener=onChange;
  if(isPreview){try{previewSignedIn=sessionStorage.getItem('ld-preview-session')==='1';admin=previewSignedIn&&sessionStorage.getItem('ld-preview-admin')==='1';}catch{}
    user=previewSignedIn?{id:admin?'preview-admin':'preview',email:admin?'Administrador de ejemplo':'Perfil de ejemplo'}:null;
    await refreshWelcome();
    window.addEventListener('storage',()=>{if(user)refreshWelcome();});
    return;
  }
  const {createClient}=await import('./vendor/supabase.js');
  client=createClient(authConfig.supabaseUrl,authConfig.supabasePublishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await client.auth.getSession();if(error)throw error;user=data.session?.user||null;
  await refreshWelcome();
  client.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setTimeout(()=>refreshWelcome().catch(()=>listener()),0);});
}
export async function previewSignIn(){if(!isPreview)throw new Error('PREVIEW_DISABLED');admin=false;previewSignedIn=true;try{sessionStorage.setItem('ld-preview-session','1');sessionStorage.removeItem('ld-preview-admin');}catch{}user={id:'preview',email:'Perfil de ejemplo'};await refreshWelcome();}
export async function previewAdminSignIn(){if(!isPreview)throw new Error('PREVIEW_DISABLED');admin=true;previewSignedIn=true;try{sessionStorage.setItem('ld-preview-session','1');sessionStorage.setItem('ld-preview-admin','1');}catch{}user={id:'preview-admin',email:'Administrador de ejemplo'};await refreshWelcome();}
export async function sendEmail(email) {
  if(!client)throw new Error('AUTH_UNAVAILABLE');
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:new URL('./',location.href).href}});if(error)throw error;
  try{sessionStorage.setItem('ld-auth-intent','spin');}catch{}
}
export async function verifyEmail(email,token) {
  const {data,error}=await client.auth.verifyOtp({email,token,type:'email'});if(error)throw error;
  user=data.user;await refreshWelcome();
}
export async function googleSignIn() {
  if(!client||!hasGoogle)throw new Error('GOOGLE_DISABLED');
  const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:new URL('./',location.href).href}});if(error)throw error;
}
export async function signOut() {
  if(client){const {error}=await client.auth.signOut();if(error)throw error;}
  try{sessionStorage.removeItem('ld-preview-session');sessionStorage.removeItem('ld-preview-admin');}catch{}user=null;admin=false;await refreshWelcome();
}
export async function claimCoupon() {
  if(!user)throw new Error('AUTH_REQUIRED');
  if(!isPreview){const {data,error}=await client.rpc('ld_claim_welcome');if(error)throw error;setState(data);return data.coupon;}
  const issue=async()=>{
    const saved=previewState();if(saved.coupon){setState(saved);return saved.coupon;}
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const issued=new Date().toISOString();
    const coupon={id:crypto.randomUUID(),code:'LD-DEMO-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),amount_cents:null,discount_percent:choosePrize(random[0]/4294967296),status:'available',issued_at:issued,expires_at:new Date(Date.parse(issued)+welcomeDuration).toISOString(),preview:true};
    // Local preview only. Live issuance and race protection always run in Postgres.
    localStorage.setItem(storeKey,JSON.stringify({coupon}));setState({coupon,eligible:false});return coupon;
  };
  return navigator.locks?navigator.locks.request('ld-welcome-preview',issue):issue();
}

const adminPreviewKey='ld-admin-preview-v1';
function adminPreviewStore(){
  let data;try{data=JSON.parse(localStorage.getItem(adminPreviewKey)||'null');}catch{}
  if(!data){const time=Date.now();const example=(code,status,issued)=>({id:crypto.randomUUID(),user_id:'preview-customer',code,amount_cents:null,discount_percent:25,status,issued_at:new Date(issued).toISOString(),expires_at:new Date(issued+welcomeDuration).toISOString(),preview:true});
    data={coupons:[example('LD-DEMO-VALIDO','available',time),example('LD-DEMO-VENCIDO','available',time-2*welcomeDuration),example('LD-DEMO-USADO','used',time-3600000)],sales:[]};localStorage.setItem(adminPreviewKey,JSON.stringify(data));}
  return data;
}
function previewLookup(code){
  const data=adminPreviewStore();const own=previewRead()?.coupon;
  const coupon=own?.code===code?own:data.coupons.find(c=>c.code===code);
  if(!coupon)return {found:false,server_now:new Date().toISOString()};
  const status=coupon.status==='available'&&Date.parse(coupon.expires_at)<=Date.now()?'expired':coupon.status;
  return {found:true,coupon,customer_email:'cliente@ejemplo.test',status,can_redeem:status==='available',sale:data.sales.find(s=>s.code===code)||null,server_now:new Date().toISOString()};
}
export async function adminLookup(code){
  if(!currentAdmin())throw new Error('ADMIN_REQUIRED');
  code=code.trim().toUpperCase();if(isPreview)return previewLookup(code);
  const {data,error}=await client.rpc('ld_admin_lookup_coupon',{p_code:code});if(error)throw error;return data;
}
export function createAdminExample(){
  if(!isPreview||!currentAdmin())throw new Error('PREVIEW_DISABLED');
  const data=adminPreviewStore();const issued=Date.now();
  const coupon={id:crypto.randomUUID(),user_id:'preview-customer',code:'LD-DEMO-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),amount_cents:null,discount_percent:25,status:'available',issued_at:new Date(issued).toISOString(),expires_at:new Date(issued+welcomeDuration).toISOString(),preview:true};
  data.coupons.unshift(coupon);localStorage.setItem(adminPreviewKey,JSON.stringify(data));return coupon.code;
}
export async function adminSales(){
  if(!currentAdmin())throw new Error('ADMIN_REQUIRED');
  if(isPreview)return {sales:adminPreviewStore().sales.slice(0,20)};
  const {data,error}=await client.rpc('ld_admin_recent_sales');if(error)throw error;return data;
}
export async function adminRedeem({code,subtotal,method,reference,requestId}){
  if(!currentAdmin())throw new Error('ADMIN_REQUIRED');
  code=code.trim().toUpperCase();
  if(!Number.isInteger(subtotal)||subtotal<=0||subtotal>100000000||!['cash','transfer'].includes(method))throw new Error('INVALID_SALE');
  if(!isPreview){const {data,error}=await client.rpc('ld_admin_redeem_coupon',{p_code:code,p_subtotal_cents:subtotal,p_method:method,p_reference:reference||null,p_request_id:requestId});if(error)throw error;return data;}
  const redeem=async()=>{
    const data=adminPreviewStore();const existing=data.sales.find(s=>s.id===requestId);
    if(existing){if(existing.code!==code||existing.subtotal_cents!==subtotal||existing.method!==method||existing.reference!==(reference||null))throw new Error('REQUEST_CONFLICT');return previewLookup(code);}
    const result=previewLookup(code);if(!result.found)throw new Error('COUPON_NOT_FOUND');
    if(result.status==='used')throw new Error('COUPON_ALREADY_USED');
    if(result.status==='expired')throw new Error('COUPON_EXPIRED');
    if(!result.can_redeem)throw new Error('COUPON_UNAVAILABLE');
    const redeemed={...result.coupon,status:'used',redeemed_at:new Date().toISOString()};
    const discount=couponDiscountCents(subtotal,redeemed);
    data.sales.unshift({id:requestId,code,customer_email:result.customer_email,subtotal_cents:subtotal,discount_cents:discount,collected_cents:subtotal-discount,method,reference:reference||null,recorded_at:redeemed.redeemed_at,recorded_by:'Administrador de ejemplo'});
    data.coupons=data.coupons.map(c=>c.code===code?redeemed:c);
    if(previewRead()?.coupon?.code===code)localStorage.setItem(storeKey,JSON.stringify({coupon:redeemed}));
    localStorage.setItem(adminPreviewKey,JSON.stringify(data));await refreshWelcome();return previewLookup(code);
  };
  return navigator.locks?navigator.locks.request('ld-welcome-preview',redeem):redeem();
}

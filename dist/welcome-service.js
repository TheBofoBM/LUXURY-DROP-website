import {authConfig} from './config.js';
import {choosePrize,welcomeDuration} from './welcome-model.js';

const configured=Boolean(authConfig.supabaseUrl&&authConfig.supabasePublishableKey);
const storeKey='ld-welcome-preview-v1';
let client=null,user=null,offset=0,accountState={coupon:null,eligible:true},listener=()=>{},previewSignedIn=false;
export const isPreview=!configured;
export const hasGoogle=configured&&authConfig.googleEnabled;
export const now=()=>Date.now()+offset;
export const currentUser=()=>user;
export const currentWelcome=()=>accountState;
function previewRead(){try{return JSON.parse(localStorage.getItem(storeKey)||'null');}catch{return null;}}
function previewState(){const saved=previewRead();const c=saved?.coupon;const valid=c&&typeof c.code==='string'&&Number.isFinite(Date.parse(c.expires_at))&&[5000,10000,15000,20000,30000,40000].includes(c.amount_cents);return {coupon:valid?c:null,eligible:!valid};}
function setState(data){accountState={coupon:data.coupon||null,eligible:!!data.eligible};if(data.server_now)offset=Date.parse(data.server_now)-Date.now();listener();}
export function errorMessage(error) {
  const text=error?.message||'';
  if(text.includes('FIRST_PURCHASE_ONLY'))return 'Esta promoción es exclusiva para cuentas sin compras anteriores.';
  if(text.includes('VERIFIED_EMAIL_REQUIRED'))return 'Confirma tu correo antes de girar.';
  if(text.includes('rate limit')||error?.status===429)return 'Espera un momento antes de volver a intentarlo.';
  if(text.includes('Email link is invalid')||text.includes('Token has expired'))return 'El código venció o no es correcto. Solicita uno nuevo.';
  return 'No pudimos completar la solicitud. Revisa tu conexión y vuelve a intentarlo.';
}
export async function refreshWelcome() {
  if(!user){setState({coupon:null,eligible:true});return;}
  if(isPreview){setState(previewState());return;}
  const {data,error}=await client.rpc('ld_welcome_state');if(error)throw error;setState(data);
}
export async function initializeWelcome(onChange) {
  listener=onChange;
  if(isPreview){try{previewSignedIn=sessionStorage.getItem('ld-preview-session')==='1';}catch{}
    user=previewSignedIn?{id:'preview',email:'Perfil de ejemplo'}:null;
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
export async function previewSignIn(){if(!isPreview)throw new Error('PREVIEW_DISABLED');previewSignedIn=true;try{sessionStorage.setItem('ld-preview-session','1');}catch{}user={id:'preview',email:'Perfil de ejemplo'};await refreshWelcome();}
export async function sendEmail(email) {
  if(!client)throw new Error('AUTH_UNAVAILABLE');
  const {error}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true,emailRedirectTo:new URL('./',location.href).href}});if(error)throw error;
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
  try{sessionStorage.removeItem('ld-preview-session');}catch{}user=null;await refreshWelcome();
}
export async function claimCoupon() {
  if(!user)throw new Error('AUTH_REQUIRED');
  if(!isPreview){const {data,error}=await client.rpc('ld_claim_welcome');if(error)throw error;setState(data);return data.coupon;}
  const issue=async()=>{
    const saved=previewState();if(saved.coupon){setState(saved);return saved.coupon;}
    const random=new Uint32Array(1);crypto.getRandomValues(random);
    const issued=new Date().toISOString();
    const coupon={id:crypto.randomUUID(),code:'LD-DEMO-'+crypto.randomUUID().replaceAll('-','').slice(0,16).toUpperCase(),amount_cents:choosePrize(random[0]/4294967296)*100,status:'available',issued_at:issued,expires_at:new Date(Date.parse(issued)+welcomeDuration).toISOString(),preview:true};
    // Local preview only. Live issuance and race protection always run in Postgres.
    localStorage.setItem(storeKey,JSON.stringify({coupon}));setState({coupon,eligible:false});return coupon;
  };
  return navigator.locks?navigator.locks.request('ld-welcome-preview',issue):issue();
}

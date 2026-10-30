export const welcomePrizes = [5,10,15,20,25];
export const welcomeWeights = [5,10,15,25,45];
export const welcomeDuration = 24*60*60*1000;
export function choosePrize(random) {
  let cumulative=0;
  for(let i=0;i<welcomeWeights.length;i++) { cumulative+=welcomeWeights[i]; if(random<cumulative/100) return welcomePrizes[i]; }
  return welcomePrizes.at(-1);
}
export function couponStatus(coupon,now=Date.now()) {
  if(!coupon) return 'none';
  if(['used','voided','reserved'].includes(coupon.status)) return coupon.status;
  return Date.parse(coupon.expires_at)>now?'available':'expired';
}
export function countdown(expiresAt,now=Date.now()) {
  const seconds=Math.max(0,Math.floor((Date.parse(expiresAt)-now)/1000));
  return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');
}
export function welcomeDiscount(subtotal,coupon,now=Date.now()) {
  return couponStatus(coupon,now)==='available'?couponDiscountCents(Math.round(subtotal*100),coupon)/100:0;
}
// Match PostgreSQL: round once on the whole merchandise subtotal, to MXN cents.
// Fixed amounts remain supported for coupons issued before the percentage offer.
export function couponDiscountCents(subtotal,coupon) {
  if(!Number.isSafeInteger(subtotal)||subtotal<=0||!coupon)return 0;
  if(Number.isInteger(coupon.discount_percent)&&welcomePrizes.includes(coupon.discount_percent))return Math.floor((subtotal*coupon.discount_percent+50)/100);
  return Number.isInteger(coupon.amount_cents)&&coupon.amount_cents>0?Math.min(subtotal,coupon.amount_cents):0;
}
export function couponLabel(coupon) {
  return coupon?.discount_percent!=null?`${coupon.discount_percent}%`:new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format((coupon?.amount_cents||0)/100)+' MXN';
}

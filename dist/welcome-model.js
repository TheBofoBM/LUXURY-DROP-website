export const welcomePrizes = [50,100,150,200,300,400];
export const welcomeWeights = [35,30,20,10,4,1];
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
  return couponStatus(coupon,now)==='available'?Math.min(subtotal,coupon.amount_cents/100):0;
}

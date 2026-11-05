// Visual feedback only: cart, prices and server-issued coupons update first.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const running=new Set(),seenProducts=new Set(),waitingCards=new Set();
let productObserver;
function play(element,frames,options={}){
  if(!element||reduced.matches||document.hidden||typeof element.animate!=='function')return null;
  const animation=element.animate(frames,{duration:350,easing:'cubic-bezier(.2,.8,.2,1)',...options});
  running.add(animation);
  const clear=()=>running.delete(animation);animation.finished.then(clear,clear);
  return animation;
}
function finish(animation,cleanup){if(animation)animation.finished.then(cleanup,cleanup);else cleanup();}
function pulse(element){return play(element,[{transform:'scale(1)'},{transform:'scale(1.16)',offset:.45},{transform:'scale(1)'}]);}
function reveal(card,animate=true){
  if(!waitingCards.has(card))return;
  waitingCards.delete(card);productObserver?.unobserve(card);card.classList.remove('motion-pending');
  seenProducts.add(card.dataset.productId);
  if(animate)play(card,[{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,delay:Number(card.dataset.motionOrder||0)*65,fill:'backwards'});
}
export function revealProducts(container){
  for(const card of waitingCards)if(!card.isConnected){waitingCards.delete(card);productObserver?.unobserve(card);}
  if(reduced.matches||!('IntersectionObserver' in window))return;
  productObserver??=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)reveal(entry.target);},{threshold:.12});
  [...container.querySelectorAll('.product')].forEach((card,index)=>{
    if(seenProducts.has(card.dataset.productId))return;
    card.dataset.motionOrder=String(index%3);card.classList.add('motion-pending');waitingCards.add(card);productObserver.observe(card);
    card.addEventListener('focusin',()=>reveal(card,false),{once:true});
  });
}
export function animateSelection(control){play(control,[{transform:'scale(.97)'},{transform:'scale(1.035)',offset:.5},{transform:'scale(1)'}],{duration:230});}
export function updateBundleProgress(container){
  const selects=[...container.querySelectorAll('[data-bundle-size]')];
  const ready=selects.filter(select=>select.value).length;
  selects.forEach(select=>select.closest('label').classList.toggle('is-complete',Boolean(select.value)));
  const text=container.querySelector('#bundle-size-progress');
  if(text)text.textContent=`${ready} de 3 tallas listas${ready===3?' · Tu paquete está listo':''}`;
  const bar=container.querySelector('.bundle-size-meter span');if(bar)bar.style.width=`${ready/3*100}%`;
}
export function captureProductFlight(image,fallback){
  if(reduced.matches||!image)return null;
  const box=image.getBoundingClientRect();
  const visible=box.bottom>0&&box.top<innerHeight&&box.right>0&&box.left<innerWidth;
  const fallbackBox=fallback?.getBoundingClientRect();
  return {src:image.currentSrc||image.src,box:visible?{left:box.left,top:Math.max(0,box.top),width:box.width,height:Math.min(box.height,innerHeight)}:{left:(fallbackBox?.left||20)+8,top:(fallbackBox?.top||innerHeight-90)-28,width:70,height:80}};
}
export function flyToBag(flight,count){
  const badge=document.querySelector('#cart-count');
  if(reduced.matches||!flight){pulse(badge);return;}
  if(document.querySelectorAll('.product-flight').length>=2){pulse(badge);return;}
  const bag=document.querySelector('#cart-open'),rect=bag.getBoundingClientRect();
  let target={x:rect.left+rect.width/2,y:rect.top+rect.height/2},marker=null;
  if(rect.top<0||rect.bottom>innerHeight){
    marker=document.createElement('div');marker.className='flying-bag-marker';marker.setAttribute('aria-hidden','true');
    const icon=bag.querySelector('svg')?.cloneNode(true);if(icon)marker.append(icon);
    const label=document.createElement('span');label.textContent=String(count);marker.append(label);document.body.append(marker);
    const corner=marker.getBoundingClientRect();target={x:corner.left+corner.width/2,y:corner.top+corner.height/2};
  }
  const ghost=document.createElement('img');ghost.src=flight.src;ghost.alt='';ghost.className='product-flight';ghost.setAttribute('aria-hidden','true');
  const {left,top,width,height}=flight.box;
  Object.assign(ghost.style,{left:`${left}px`,top:`${top}px`,width:`${width}px`,height:`${height}px`});document.body.append(ghost);
  const dx=target.x-left-width/2,dy=target.y-top-height/2;
  const animation=play(ghost,[{transform:'translate(0,0) scale(.9)',opacity:.9},{transform:`translate(${dx*.4}px,${dy*.4-24}px) scale(.55)`,opacity:.9,offset:.5},{transform:`translate(${dx}px,${dy}px) scale(.09)`,opacity:0}],{duration:560,easing:'cubic-bezier(.35,.05,.4,1)'});
  finish(animation,()=>{
    ghost.remove();pulse(badge);
    if(marker){const out=play(marker,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.9)'}],{duration:300,delay:650,fill:'backwards'});finish(out,()=>marker.remove());}
  });
}
export function animateCouponApplied(container,before,after,format){
  const card=container.querySelector('.coupon-applied');
  if(card)play(card,[{opacity:.6,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{duration:380});
  const value=container.querySelector('#cart-total-value');
  if(!value||reduced.matches||!Number.isFinite(before)||before===after)return;
  const old=document.createElement('span');old.className='amount-before';old.setAttribute('aria-hidden','true');old.textContent=format(before);value.append(old);
  const amount=value.querySelector('.amount-current');
  play(amount,[{opacity:.1,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],{duration:420});
  finish(play(old,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-9px)'}],{duration:320}),()=>old.remove());
}
export function celebratePrize(dialog,result){
  if(!dialog.open||reduced.matches)return;
  play(result,[{opacity:.6,transform:'scale(.96)'},{opacity:1,transform:'scale(1.035)',offset:.55},{opacity:1,transform:'scale(1)'}],{duration:500});
  const layer=document.createElement('div');layer.className='prize-confetti';layer.setAttribute('aria-hidden','true');
  for(let i=0;i<20;i++){
    const piece=document.createElement('i');piece.style.background=['#d8bd7b','#99814b','#f5f1e3','#69705d'][i%4];layer.append(piece);
    const x=(i%7-3)*44,y=80+(i%5)*34,launch=-55-(i%4)*18;
    play(piece,[{opacity:0,transform:'translate(0,0) rotate(0deg)'},{opacity:1,transform:`translate(${x*.55}px,${launch}px) rotate(${i*23}deg)`,offset:.35},{opacity:0,transform:`translate(${x}px,${y}px) rotate(${i*67+90}deg)`}],{duration:950+(i%4)*90,delay:(i%3)*35,fill:'backwards'});
  }
  dialog.append(layer);
  const shine=document.createElement('div');shine.className='prize-shine';shine.setAttribute('aria-hidden','true');layer.append(shine);
  finish(play(shine,[{transform:'translateX(-120%)'},{transform:'translateX(120%)'}],{duration:1500}),()=>layer.remove());
}
export function setupStoreMotion(){
  const links=[...document.querySelectorAll('.collection-links a,.header nav a')].filter(link=>['#catalogo','#daily-drop'].includes(link.hash));
  const activate=id=>links.forEach(link=>{const selected=link.hash===id;link.classList.toggle('is-current',selected);if(link.closest('.header'))link.classList.toggle('active',selected);if(selected)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  activate(location.hash==='#daily-drop'?'#daily-drop':'#catalogo');
  links.forEach(link=>link.addEventListener('click',()=>{activate(link.hash);play(link,[{transform:'translateY(0)'},{transform:'translateY(-2px)',offset:.45},{transform:'translateY(0)'}],{duration:250});}));
  window.addEventListener('hashchange',()=>{if(['#catalogo','#daily-drop'].includes(location.hash))activate(location.hash);});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)activate(entry.target.closest('section').id==='daily-drop'?'#daily-drop':'#catalogo');},{rootMargin:'-10% 0px -55% 0px'});
    for(const selector of ['#catalog-title','#daily-title']){const title=document.querySelector(selector);if(title)observer.observe(title);}
  }
}
reduced.addEventListener?.('change',()=>{if(reduced.matches){for(const animation of running)animation.cancel();for(const card of [...waitingCards])reveal(card,false);}});

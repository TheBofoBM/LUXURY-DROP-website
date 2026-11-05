// Direct manipulation belongs only to the BOSS display, never catalog images.
export function setupHeroMotion(){
  const surface=document.querySelector('#hero-motion');
  if(!surface)return;
  let pointer=null,frame=0,pose={x:0,y:0,rx:0,ry:0};
  const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value));
  function paint(){
    frame=0;
    for(const [key,value] of Object.entries(pose))surface.style.setProperty(`--shirt-${key}`,`${value}${key==='x'||key==='y'?'px':'deg'}`);
    surface.style.setProperty('--shirt-shadow-x',`${-pose.x*.45}px`);
    surface.style.setProperty('--shirt-shadow-y',`${12+Math.abs(pose.ry)*.12}px`);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(paint);}
  function reset(){
    const id=pointer?.id;pointer=null;
    if(frame){cancelAnimationFrame(frame);frame=0;}
    surface.classList.remove('is-dragging');
    pose={x:0,y:0,rx:0,ry:0};paint();
    if(id!=null&&surface.hasPointerCapture(id))surface.releasePointerCapture(id);
  }
  surface.addEventListener('pointerdown',event=>{
    if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;
    reset();pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
    surface.setPointerCapture(event.pointerId);
    surface.classList.add('is-dragging');
    if(event.pointerType==='mouse'){event.preventDefault();surface.focus({preventScroll:true});}
  });
  surface.addEventListener('pointermove',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;
    pose={x:clamp(dx*.12,24),y:clamp(dy*.09,16),rx:clamp(-dy*.1,16),ry:clamp(dx*.14,26)};schedule();
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])surface.addEventListener(name,event=>{if(pointer?.id===event.pointerId)reset();});
  surface.addEventListener('keydown',event=>{
    const actions={ArrowLeft:()=>{pose.ry=clamp(pose.ry-7,26);pose.x=clamp(pose.x-4,24);},ArrowRight:()=>{pose.ry=clamp(pose.ry+7,26);pose.x=clamp(pose.x+4,24);},ArrowUp:()=>{pose.rx=clamp(pose.rx+6,16);pose.y=clamp(pose.y-3,16);},ArrowDown:()=>{pose.rx=clamp(pose.rx-6,16);pose.y=clamp(pose.y+3,16);}};
    if(['Escape','Home','Enter',' '].includes(event.key)){event.preventDefault();reset();return;}
    if(!actions[event.key]||pointer)return;
    event.preventDefault();actions[event.key]();schedule();
  });
  surface.addEventListener('blur',reset);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
}

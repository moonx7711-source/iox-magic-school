'use strict';
(() => {
  const invitation=document.querySelector('#invitation');
  const paper=document.querySelector('.letter-writing');
  const pen=paper.querySelector('.writing-pen');
  const glyphs=[...paper.querySelectorAll('.writing-glyph')];
  const lengths=glyphs.map(g=>g.getTotalLength());
  const total=lengths.reduce((a,b)=>a+b,0);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let active=false, frame=0, lastTime=0, elapsed=0;
  glyphs.forEach((g,i)=>{g.style.strokeDasharray=lengths[i];g.style.strokeDashoffset=lengths[i];});
  function render(ms){
    // Start after the parchment has unfolded; write, hover, then repeat quietly.
    const local=ms%11000;
    const progress=motion.matches?1:Math.max(0,Math.min(1,(local-2100)/4000));
    const fade=motion.matches?1:local<1800?0:local<2100?(local-1800)/300:local>10300?(11000-local)/700:1;
    paper.style.opacity=fade;
    let remaining=progress*total, current=0, currentPart=0;
    glyphs.forEach((g,i)=>{
      const part=Math.max(0,Math.min(1,remaining/lengths[i]));
      g.style.strokeDashoffset=lengths[i]*(1-part);
      g.style.fillOpacity=Math.max(0,Math.min(1,(part-.55)/.45));
      if(remaining>=0){current=i;currentPart=part;}
      remaining-=lengths[i];
    });
    const point=glyphs[current].getPointAtLength(lengths[current]*currentPart);
    const hovering=progress===1&&!motion.matches;
    const x=point.x+(hovering?Math.sin(ms/950)*4:0);
    const y=point.y+(hovering?Math.sin(ms/1100)*5-5:0);
    pen.style.left=(x/600*100)+'%';pen.style.top=(y/220*100)+'%';
    pen.style.setProperty('--writing-tilt',(hovering?-16+Math.sin(ms/1500)*2:-18+Math.sin(ms/125)*1.5)+'deg');
    paper.classList.toggle('ink-complete',progress===1);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;lastTime=0;}
  function tick(stamp){
    frame=0;if(!active||document.hidden||motion.matches)return;
    if(lastTime)elapsed+=Math.max(0,stamp-lastTime);
    lastTime=stamp;render(elapsed);frame=requestAnimationFrame(tick);
  }
  function sync(){
    const shouldRun=invitation.open&&invitation.classList.contains('letter-mode');
    if(!shouldRun){active=false;stop();paper.style.opacity=0;return;}
    if(!active){active=true;elapsed=0;render(0);}
    if(motion.matches){stop();render(6100);return;}
    if(!document.hidden&&!frame)frame=requestAnimationFrame(tick);
  }
  new MutationObserver(sync).observe(invitation,{attributes:true,attributeFilter:['open','class']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else sync();});
  motion.addEventListener('change',()=>{stop();sync();});
})();

'use strict';
(() => {
  const form=document.querySelector('#enroll-form'),input=document.querySelector('#nickname');
  const invitation=document.querySelector('#invitation'),ceremony=document.querySelector('#name-ceremony');
  const sheet=ceremony.querySelector('.ceremony-paper');
  const name=document.querySelector('#revealed-name'),note=ceremony.querySelector('.name-storage-note');
  const status=document.querySelector('#name-save-status'),save=document.querySelector('#save-invitation-name');
  const close=document.querySelector('#close-name-ceremony'),canvas=document.querySelector('#name-stardust'),ctx=canvas.getContext('2d');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),key='iox.magic-school.member.v1';
  let composing=false,busy=false,frame=0,last=0,elapsed=0,particles=[],paperRect=null;
  let width=0,height=0,phase='idle',launchTimer=0,token=0;
  function restore(){
    if(busy)return;
    try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&typeof saved.name==='string')input.value=saved.name.slice(0,24);}catch{}
    status.textContent='';
  }
  window.magicEnrollment={restore};restore();
  input.addEventListener('compositionstart',()=>composing=true);
  input.addEventListener('compositionend',()=>composing=false);
  input.addEventListener('input',()=>{input.setCustomValidity('');status.textContent='';});
  function resize(){
    width=innerWidth;height=innerHeight;
    const ratio=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);
    if(paperRect){
      const w=Math.min(paperRect.width,width-24),h=Math.min(paperRect.height,height-28);
      sheet.style.width=w+'px';sheet.style.height=h+'px';
      sheet.style.left=(width-w)/2+'px';sheet.style.top=(height-h)/2+'px';
    }
  }
  function fitName(){
    name.style.fontSize='';
    let size=parseFloat(getComputedStyle(name).fontSize);
    while(name.scrollWidth>width*.86&&size>14){size-=2;name.style.fontSize=size+'px';}
  }
  function emit(count,p){
    const r=sheet.getBoundingClientRect();
    for(let i=0;i<count&&particles.length<680;i++){
      const x=r.left+Math.random()*r.width,y=r.top+r.height*(1-p)+(Math.random()-.5)*22;
      particles.push({x,y,vx:(Math.random()-.5)*90,vy:-22-Math.random()*80,life:0,max:1.2+Math.random()*1.9,size:.6+Math.random()*2.1,hue:Math.random()<.8?38+Math.random()*15:190+Math.random()*80,twinkle:Math.random()*6.28});
    }
  }
  function reveal(){
    if(phase==='revealed')return;
    phase='revealed';ceremony.classList.add('name-visible');sheet.style.visibility='hidden';
    note.textContent='이름이 이 기기에 저장되었습니다';name.focus({preventScroll:true});
    ceremony.dispatchEvent(new CustomEvent('magic:name-revealed',{detail:{name:name.textContent}}));
  }
  function render(t,dt){
    ctx.clearRect(0,0,width,height);
    const p=Math.max(0,Math.min(1,(t-120)/2900));
    const edge=(1-p)*100;
    sheet.style.maskImage=`linear-gradient(to bottom,#000 0%,#000 ${Math.max(0,edge-5)}%,transparent ${Math.min(100,edge+5)}%)`;
    sheet.style.webkitMaskImage=sheet.style.maskImage;
    sheet.style.opacity=String(t>2800?Math.max(0,(3100-t)/300):1);
    sheet.style.transform=`translateY(${-p*12}px) rotate(${p*.45}deg)`;
    sheet.style.setProperty('--dissolve-edge',edge+'%');
    if(p>0&&p<1)emit(Math.ceil(150*dt),p);
    if(t>2500)ceremony.classList.add('name-visible');
    if(t>3200)reveal();
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(const part of particles){
      part.life+=dt;part.x+=part.vx*dt;part.y+=part.vy*dt;part.vx*=Math.exp(-dt*.4);
      const a=Math.max(0,1-part.life/part.max)*(.65+.35*Math.sin(t*.008+part.twinkle));
      ctx.fillStyle=`hsla(${part.hue},95%,82%,${a})`;ctx.shadowBlur=9;ctx.shadowColor=`hsla(${part.hue},95%,70%,${a})`;
      ctx.beginPath();ctx.arc(part.x,part.y,part.size,0,Math.PI*2);ctx.fill();
      if(part.size>2){ctx.fillRect(part.x-4,part.y-.4,8,.8);ctx.fillRect(part.x-.4,part.y-4,.8,8);}
    }
    ctx.restore();particles=particles.filter(p=>p.life<p.max);
  }
  function tick(stamp){
    frame=0;if(!ceremony.open||document.hidden)return;
    if(!last)last=stamp;const diff=Math.max(0,stamp-last);last=stamp;elapsed+=diff;
    render(elapsed,Math.min(diff/1000,.06));
    if(elapsed<6800)frame=requestAnimationFrame(tick);
    else ctx.clearRect(0,0,width,height);
  }
  function launch(value){
    busy=false;save.disabled=false;invitation.classList.remove('name-saving');
    const rect=invitation.getBoundingClientRect(),style=getComputedStyle(invitation);
    paperRect={width:rect.width,height:rect.height};
    sheet.style.padding=style.padding;sheet.querySelector('.ceremony-ink').textContent=value;
    name.textContent=value;name.classList.toggle('korean-name',/[\u3131-\uD79D]/u.test(value));
    name.style.setProperty('--name-letters',String(Math.min(24,[...value].length)));
    ceremony.classList.remove('name-visible');sheet.style.visibility='';sheet.style.opacity=1;sheet.style.transform='';sheet.style.maskImage='none';sheet.style.webkitMaskImage='none';
    note.textContent='';particles=[];elapsed=0;last=0;phase='dissolving';
    invitation.close();ceremony.showModal();document.body.classList.add('name-ceremony-open');resize();fitName();
    ceremony.dispatchEvent(new CustomEvent('magic:name-start',{detail:{name:value}}));
    document.fonts.ready.then(()=>{if(ceremony.open)fitName();});
    if(reducedMotion.matches){sheet.style.visibility='hidden';reveal();}else frame=requestAnimationFrame(tick);
  }
  form.addEventListener('submit',e=>{
    e.preventDefault();if(composing||busy)return;
    const value=input.value.normalize('NFC').trim().replace(/[\u0000-\u001f\u007f]/gu,'');
    if(!value){input.setCustomValidity('초대장에 적을 이름을 입력해 주세요.');input.reportValidity();return;}
    try{localStorage.setItem(key,JSON.stringify({version:1,name:value,savedAt:new Date().toISOString()}));}
    catch{status.textContent='이 브라우저에 저장할 수 없습니다. 저장 공간 설정을 확인한 뒤 다시 눌러 주세요.';return;}
    input.value=value;input.blur();busy=true;save.disabled=true;
    invitation.classList.add('name-saving');status.textContent='이름이 새겨졌습니다';
    const current=++token;launchTimer=setTimeout(()=>{if(current===token&&invitation.open)launch(value);},reducedMotion.matches?0:700);
  });
  invitation.addEventListener('close',()=>{
    clearTimeout(launchTimer);token++;busy=false;save.disabled=false;invitation.classList.remove('name-saving');
  });
  close.addEventListener('click',()=>ceremony.close());
  ceremony.addEventListener('close',()=>{cancelAnimationFrame(frame);frame=0;particles=[];phase='idle';document.body.classList.remove('name-ceremony-open');ctx.clearRect(0,0,width,height);document.querySelector('#magic-test').focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else if(ceremony.open&&elapsed<6800&&!reducedMotion.matches&&!frame)frame=requestAnimationFrame(tick);});
  reducedMotion.addEventListener('change',()=>{if(ceremony.open&&reducedMotion.matches){cancelAnimationFrame(frame);frame=0;ctx.clearRect(0,0,width,height);reveal();}});
  window.addEventListener('resize',()=>{if(ceremony.open){resize();fitName();}});
})();

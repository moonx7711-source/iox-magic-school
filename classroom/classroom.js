(() => {
 'use strict';
 const body=document.body,scene=document.querySelector('#scene'),wall=document.querySelector('#wallInstruction'),api=window.IOXMagicBoard;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),wide=scene.querySelector('.shot-wide'),close=scene.querySelector('.shot-close');
 const ink=document.createElement('img');ink.src=close.src;ink.className='instruction-ink';ink.alt='';ink.setAttribute('aria-hidden','true');wall.append(ink);
 let timers=[],ready=false,runId=0;
 const clearTimers=()=>{timers.forEach(clearTimeout);timers=[];};
 function layoutWall(){
  const r=scene.getBoundingClientRect(),cover=scene.classList.contains('zoomed'),scale=(cover?Math.max:Math.min)(r.width/1536,r.height/864),w=1536*scale,h=864*scale,x=(r.width-w)/2,y=(r.height-h)/2;
  const textX=x+495*scale,textY=y+798*scale,textW=550*scale,textH=31*scale;
  Object.assign(wall.style,{left:textX+'px',top:textY+'px',width:textW+'px',height:textH+'px',fontSize:(22*scale)+'px'});
  Object.assign(ink.style,{width:w+'px',height:h+'px',left:(-495*scale)+'px',top:(-798*scale)+'px'});
 }
 function finish(){clearTimers();ready=true;body.classList.remove('classroom-intro');body.classList.add('classroom-approaching','classroom-crossfade','classroom-ready');document.querySelector('#status').textContent='칠판에 그림을 그리고, 아래 빛나는 안내 문구를 터치해 마법을 부여하세요.';layoutWall();window.dispatchEvent(new CustomEvent('iox-classroom:ready'));}
 async function enter(){
  if(api.getState().busy)return;clearTimers();ready=false;const id=++runId;body.classList.add('classroom-intro');body.classList.remove('classroom-approaching','classroom-crossfade','classroom-ready');document.querySelector('#status').textContent='생명의 교실에 들어왔습니다. 칠판으로 다가갑니다…';
  try{await Promise.all([wide.decode(),close.decode()]);}catch{document.querySelector('#status').textContent='교실 이미지 로딩을 기다리고 있습니다. 칠판으로 바로 가기를 눌러주세요.';}if(id!==runId)return;
  if(reduced.matches){finish();return;}
  timers.push(setTimeout(()=>body.classList.add('classroom-approaching'),850));timers.push(setTimeout(()=>body.classList.add('classroom-crossfade'),2350));timers.push(setTimeout(finish,4000));
 }
 wall.addEventListener('click',()=>{if(ready)api.awaken();});document.querySelector('#skipApproach').onclick=()=>{runId++;finish();};document.querySelector('#replayRoom').onclick=enter;
 window.addEventListener('resize',layoutWall);new ResizeObserver(layoutWall).observe(scene);window.addEventListener('iox-magic:complete',()=>{wall.classList.add('magic-complete');});
 let name='';try{name=JSON.parse(localStorage.getItem('iox.magic-school.member.v1')||'null')?.name||'';}catch{}if(name)document.querySelector('#roomGreeting').textContent=name+'님의 생명의 교실';
 // Prefer this package's school entry when opened standalone; same-origin module has a relative return.
 document.querySelector('#returnBook').href=location.pathname.includes('/classroom/')?'../index.html':'school/index.html';
 layoutWall();enter();
})();

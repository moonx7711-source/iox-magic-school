'use strict';
const wand=document.querySelector('#wand'), canvas=document.querySelector('#magic'), ctx=canvas.getContext('2d'), image=document.querySelector('#wand-image');
const W=2172,H=724, reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let paused=reduced.matches, visible=true, inView=true, boostedUntil=0, time=0, last=0, frameId=0, imageReady=false, crystalActive=false;
const layer=document.createElement('canvas');layer.width=W;layer.height=H;const fx=layer.getContext('2d');
// Adaptive render resolution keeps the flowing light light-weight on phones.
const renderWidth=Math.min(1600,Math.max(640,Math.round(window.innerWidth*1.4)));
canvas.width=layer.width=renderWidth;canvas.height=layer.height=Math.round(renderWidth*H/W);
ctx.setTransform(renderWidth/W,0,0,renderWidth/W,0,0);fx.setTransform(renderWidth/W,0,0,renderWidth/W,0,0);
function groove(u,strand=0){const x=74+u*1418;const phase=u*Math.PI*2*8.05+strand*Math.PI+.3;return {x,y:361-u*9+Math.sin(phase)*(3+u*35)};}
function draw(t){
  if(!imageReady)return;
  fx.clearRect(0,0,W,H);
  const boost=t<boostedUntil?1.35:1;
  const travel=t/5400;
  // Light diffuses from the wood's interior into the carved spiral seams.
  // Broad low-contrast bands preserve the wood grain, without an external neon wrap.
  for(let strand=0;strand<2;strand++){
    for(let j=0;j<260;j++){
      const u=j/260,u2=(j+1)/260,p=groove(u,strand),q=groove(u2,strand);
      const phase=((1-u-travel)%1+1)%1;
      const pulse=Math.pow(Math.max(0,Math.cos(phase*Math.PI*2)),5);
      const hue=(u*330+t*.045+strand*30)%360;
      fx.strokeStyle=`hsla(${hue},96%,59%,${(.10+pulse*.48)*boost})`;
      fx.lineWidth=(11+u*5+pulse*7)*boost;
      fx.lineCap='round';
      fx.beginPath();fx.moveTo(p.x,p.y);fx.lineTo(q.x,q.y);fx.stroke();
    }
  }
  // A gentle inner refraction behind the diamond, leaving white facets visible.
  const hue=(t*.045)%360;
  fx.save();fx.translate(1855,350);fx.scale(1,.58);
  const refract=fx.createRadialGradient(0,0,0,0,0,49);
  refract.addColorStop(0,`hsla(${hue},55%,91%,${.16*boost})`);
  refract.addColorStop(.6,`hsla(${(hue+65)%360},60%,80%,.09)`);
  refract.addColorStop(1,'rgba(255,255,255,0)');
  fx.fillStyle=refract;fx.fillRect(-55,-55,110,110);fx.restore();
  ctx.clearRect(0,0,W,H);
  ctx.save();ctx.filter='blur(6px)';ctx.drawImage(layer,0,0,W,H);ctx.restore();
  // Re-mask after diffusion: all RGB illumination is inside the actual object.
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(image,0,0,W,H);
  ctx.globalCompositeOperation='source-over';
}
function tick(stamp){frameId=0;if(paused||!visible||!inView||!imageReady||crystalActive){last=0;return;}if(last)time+=Math.min(stamp-last,50);last=stamp;draw(time);frameId=requestAnimationFrame(tick);}
function start(){if(!frameId&&!paused&&visible&&inView&&imageReady&&!crystalActive)frameId=requestAnimationFrame(tick);}
function ready(){if(imageReady)return;imageReady=true;draw(time);start();}if(image.complete&&image.naturalWidth)ready();else image.addEventListener('load',ready,{once:true});image.addEventListener('error',()=>{document.querySelector('#status').textContent='지팡이 이미지를 불러오지 못했습니다. 새로고침해 주세요.';});
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;document.body.classList.toggle('page-inactive',!visible);last=0;if(visible)start();});new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;last=0;if(inView)start();}).observe(wand);
reduced.addEventListener('change',e=>{paused=e.matches;last=0;if(!paused)start();else draw(time);});
const letterPanel=document.querySelector('#invite-letter');
const dialog=document.querySelector('#invitation'),formPanel=document.querySelector('#invite-form');
const nickname=document.querySelector('#nickname');
let opener;
const invitationSound=document.querySelector('#invitation-sound');
invitationSound.volume=.65;
function stopInvitationSound(){invitationSound.pause();invitationSound.currentTime=0;}
function playInvitationSound(){stopInvitationSound();const playback=invitationSound.play();if(playback)playback.catch(()=>{});}
dialog.addEventListener('close',stopInvitationSound);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopInvitationSound();});
function unfoldLetter(){
  playInvitationSound();letterPanel.classList.remove('unfolding');
  if(!reduced.matches){void letterPanel.offsetWidth;letterPanel.classList.add('unfolding');}
}
letterPanel.addEventListener('animationend',e=>{if(e.animationName==='letter-arrive')letterPanel.classList.remove('unfolding');});
reduced.addEventListener('change',()=>{if(reduced.matches)letterPanel.classList.remove('unfolding');});
function openInvitation(trigger){
  window.magicEnrollment?.restore();
  opener=trigger;letterPanel.hidden=false;formPanel.hidden=true;
  dialog.classList.add('letter-mode');dialog.showModal();unfoldLetter();
  dialog.scrollTop=0;document.querySelector('#continue-invitation').focus({preventScroll:true});
}
document.querySelector('#continue-invitation').addEventListener('click',()=>{
  stopInvitationSound();letterPanel.classList.remove('unfolding');letterPanel.hidden=true;
  formPanel.hidden=false;dialog.classList.remove('letter-mode');dialog.scrollTop=0;nickname.focus();
});
document.querySelectorAll('[data-enroll]').forEach(el=>el.addEventListener('click',()=>openInvitation(el)));
document.querySelector('.close-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
dialog.addEventListener('close',()=>{letterPanel.classList.remove('unfolding');opener?.focus();});

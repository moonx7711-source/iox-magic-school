/* IOX Living Blackboard — standalone, dependency-free integration module */
(() => {
'use strict';
const $ = s => document.querySelector(s), scene=$('#scene'), canvas=$('#drawing'), ctx=canvas.getContext('2d'), fx=$('#magic'), f=fx.getContext('2d');
const STORAGE='iox-living-blackboard-v1';
let strokes=[],active=null,pointerId=null,color='#f5f0d9',width=5,erase=false,busy=false,sound=false,audio=null,dpr=1,rect={},flight=null,particles=[],lastTime=0,totalBorn=0,toastTimer,stageTimer;
const sprite=new Image();sprite.src='assets/butterfly.png';
try{const data=JSON.parse(localStorage.getItem(STORAGE)||'[]');if(Array.isArray(data))strokes=data.filter(s=>Array.isArray(s.points)&&typeof s.color==='string'&&Number.isFinite(s.width)).slice(-400).map(s=>({...s,points:s.points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,8000)}));}catch{}
const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(strokes));}catch{}};
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function status(text){$('#status').textContent=text;}
function stage(text,ms=2600){$('#stageMessage').textContent=text;$('#stageMessage').classList.add('visible');clearTimeout(stageTimer);stageTimer=setTimeout(()=>$('#stageMessage').classList.remove('visible'),ms);}
function resize(){
  const r=scene.getBoundingClientRect(),scale=(scene.classList.contains('zoomed')?Math.max:Math.min)(r.width/1536,r.height/864),ix=(r.width-1536*scale)/2,iy=(r.height-864*scale)/2;
  const x=Math.max(12,ix+164*scale),y=Math.max(56,iy+162*scale),right=Math.min(r.width-12,ix+1360*scale),bottom=Math.min(r.height-30,iy+698*scale);
  rect={x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)};
  Object.assign(canvas.style,{left:x+'px',top:y+'px',width:rect.w+'px',height:rect.h+'px'});
  dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(rect.w*dpr);canvas.height=Math.round(rect.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  fx.width=Math.round(innerWidth*dpr);fx.height=Math.round(innerHeight*dpr);f.setTransform(dpr,0,0,dpr,0,0);draw();
}
function drawStroke(s){
 if(!s.points.length)return;
 ctx.save();ctx.globalCompositeOperation=s.erase?'destination-out':'source-over';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=s.width*Math.min(rect.w,rect.h)/400;ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.globalAlpha=s.erase?1:.93;
 const pts=s.points;ctx.beginPath();ctx.moveTo(pts[0].x*rect.w,pts[0].y*rect.h);
 if(pts.length===1){ctx.arc(pts[0].x*rect.w,pts[0].y*rect.h,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}
 else{for(let i=1;i<pts.length;i++){ctx.lineTo(pts[i].x*rect.w,pts[i].y*rect.h);}ctx.stroke();}
 // A faint soft edge makes every stroke sit on the chalkboard surface.
 if(!s.erase&&pts.length>1){ctx.globalAlpha=.16;ctx.lineWidth*=1.7;ctx.stroke();}ctx.restore();
}
function draw(){ctx.clearRect(0,0,rect.w,rect.h);strokes.forEach(drawStroke);if(active)drawStroke(active);$('#hint').classList.toggle('hidden',busy||strokes.length>0||!!active);$('#undo').disabled=busy||strokes.length===0;}
function point(e){const r=canvas.getBoundingClientRect();return{x:Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))};}
canvas.addEventListener('pointerdown',e=>{if(busy||pointerId!==null||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();pointerId=e.pointerId;canvas.setPointerCapture(pointerId);active={color,width:erase?width*4:width,erase,points:[point(e)]};draw();});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointerId||!active)return;e.preventDefault();for(const p of (e.getCoalescedEvents?.()||[e])){active.points.push(point(p));}draw();});
function finish(e){if(e.pointerId!==pointerId)return;if(active){strokes.push(active);active=null;persist();}pointerId=null;draw();status($('#mode').value==='lines'?'그림이 준비되면 ‘마법 부여하기’를 눌러보세요.':'그림이 준비되면 ‘생명 불어넣기’를 눌러보세요.');}
canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);canvas.addEventListener('lostpointercapture',finish);
document.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{color=b.dataset.color;erase=false;$('#eraser').setAttribute('aria-pressed','false');canvas.classList.remove('eraser');document.querySelectorAll('.swatch').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});});
$('#size').oninput=e=>width=+e.target.value;
$('#eraser').onclick=()=>{erase=!erase;$('#eraser').setAttribute('aria-pressed',String(erase));canvas.classList.toggle('eraser',erase);};
$('#undo').onclick=()=>{if(busy)return;strokes.pop();persist();draw();status('마지막 획을 되돌렸습니다.');};
$('#clear').onclick=()=>{if(busy)return;strokes=[];persist();draw();status('깨끗한 칠판이에요. 새로운 그림을 그려보세요.');};
$('#expand').onclick=()=>{scene.classList.toggle('zoomed');$('#expand').innerHTML=scene.classList.contains('zoomed')?'⛶ <span>원래 크기</span>':'⛶ <span>크게 보기</span>';resize();};
function pathStroke(points,c=color,w=5){strokes.push({points,color:c,width:w,erase:false});}
function bezier(a,b,c,d,n=40){return Array.from({length:n+1},(_,i)=>{const t=i/n,u=1-t;return{x:u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],y:u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]};});}
function sample(){if(busy)return;strokes=[];const ratio=rect.w/rect.h;const wingWidth=Math.min(.25,.26/ratio),cx=.5,cy=.5;
 const tr=pts=>pts.map(p=>({x:cx+(p.x-.5)*wingWidth/.25,y:cy+(p.y-.5)*.9}));
 for(const side of [-1,1]){
  const mirror=pts=>pts.map(p=>({x:.5+side*(p.x-.5),y:p.y}));
  let p=[...bezier([.5,.5],[.76,.02],[.9,.19],[.77,.45]),...bezier([.77,.45],[.88,.7],[.67,.87],[.5,.53])];pathStroke(tr(mirror(p)),color,5);
  pathStroke(tr(mirror(bezier([.5,.5],[.63,.43],[.74,.38],[.77,.45]))),color,3);
  pathStroke(tr(mirror(bezier([.5,.43],[.54,.25],[.64,.27],[.66,.3]))),color,3);
  pathStroke(tr(mirror(bezier([.5,.52],[.64,.53],[.71,.61],[.7,.68]))),color,3);
  pathStroke(tr(mirror(bezier([.5,.34],[.51,.24],[.56,.18],[.59,.2]))),color,3);
 }
 pathStroke(tr([{x:.5,y:.36},{x:.5,y:.68}]),color,7);persist();draw();status($('#mode').value==='lines'?'예제를 그렸어요. 마법 부여하기로 그린 모양을 그대로 띄워보세요.':'나비 예제를 그렸어요. 이제 생명을 불어넣어 보세요.');emit('drawing-ready',{source:'example'});
}
$('#example').onclick=sample;
function visibleBounds(){const img=ctx.getImageData(0,0,canvas.width,canvas.height);let minX=img.width,minY=img.height,maxX=-1,maxY=-1,count=0,left=0,right=0,top=0,bottom=0;
 // Scan every alpha pixel so even a tiny dot, thin line, or erased gap is respected.
 for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++)if(img.data[(y*img.width+x)*4+3]>12){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);count++;}
 if(!count)return null;
 const cx=(minX+maxX+1)/2,cy=(minY+maxY+1)/2;
 for(let y=minY;y<=maxY;y+=3)for(let x=minX;x<=maxX;x+=3)if(img.data[(y*img.width+x)*4+3]>35){if(x<cx)left++;else right++;if(y<cy)top++;else bottom++;}
 return{x:cx/dpr,y:cy/dpr,w:(maxX-minX+1)/dpr,h:(maxY-minY+1)/dpr,count,balance:Math.min(left,right)/Math.max(1,left,right),vertical:Math.min(top,bottom)/Math.max(1,top,bottom),pixels:{minX,minY,maxX,maxY}};
}
function hasButterflyShape(b){const aspect=b.w/b.h;return b.count>=20&&b.balance>.42&&b.vertical>.22&&aspect>.55&&aspect<2.6;}
function setBusy(v){busy=v;document.body.classList.toggle('busy',v);for(const id of ['example','clear','bringAlive','save','mode','expand'])$('#'+id).disabled=v;draw();}
function emit(name,detail){window.dispatchEvent(new CustomEvent('iox-magic:'+name,{detail:{version:1,type:flight?.kind||($('#mode').value==='lines'?'lines':'butterfly'),...detail}}));}
function chime(){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();for(let i=0;i<6;i++){const osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.value=[523,659,784,1046,1318,1568][i];gain.gain.setValueAtTime(0,audio.currentTime+i*.1);gain.gain.linearRampToValueAtTime(.045,audio.currentTime+i*.1+.02);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+i*.1+1.2);osc.connect(gain).connect(audio.destination);osc.start(audio.currentTime+i*.1);osc.stop(audio.currentTime+i*.1+1.3);}}catch{}}
$('#sound').onclick=()=>{sound=!sound;$('#sound').setAttribute('aria-pressed',String(sound));$('#sound span').textContent=sound?'소리 켜짐':'소리 꺼짐';if(sound)chime();};
function awaken(){if(busy||active)return;if(!document.body.classList.contains('classroom-ready')){toast('잠시 후 칠판으로 다가가면 그릴 수 있어요.');return;}const b=visibleBounds();if(!b){toast('칠판에 그림을 그리거나 ‘나비 예제’를 눌러주세요.');return;}
 if($('#mode').value==='lines'){launchLines(b);return;}
 if($('#mode').value==='auto'&&!hasButterflyShape(b)){toast('나비 형태가 뚜렷하지 않아요. 양쪽 날개를 그리거나 ‘나비로 생명 불어넣기’를 선택해보세요.');status('형태 분석 보류 · 이 기능은 단순한 좌우 분포 비교 테스트입니다.');emit('recognition-pending',{});return;}
 const r=canvas.getBoundingClientRect();flight={kind:'butterfly',start:performance.now(),x:r.left+b.x,y:r.top+b.y,size:Math.min(155,Math.max(65,b.w*.65)),baseColor:color,phase:'awakening',history:[]};setBusy(true);stage('그림이 깨어나고 있어요…',1800);status('분필 그림에 작은 생명이 깃들고 있어요.');chime();emit('awakening',{bounds:b});
 for(let i=0;i<100;i++)particles.push({x:flight.x+(Math.random()-.5)*b.w,y:flight.y+(Math.random()-.5)*b.h,vx:(Math.random()-.5)*65,vy:-20-Math.random()*65,life:1+Math.random()*1.8,age:0,size:.7+Math.random()*2.2});
 requestAnimationFrame(animate);
}
$('#bringAlive').onclick=awaken;
function fallbackButterfly(x,y,size,flap,angle){f.save();f.translate(x,y);f.rotate(angle);for(const sign of [-1,1]){f.save();f.scale(sign*flap,1);const g=f.createLinearGradient(0,0,size*.6,-size*.4);g.addColorStop(0,'#e2aa53');g.addColorStop(.6,'#dd7522');g.addColorStop(1,'#1f1d19');f.fillStyle=g;f.strokeStyle='#211b13';f.lineWidth=3;f.beginPath();f.moveTo(0,0);f.bezierCurveTo(size*.7,-size*.9,size*.8,-size*.25,size*.43,0);f.bezierCurveTo(size*.65,size*.6,size*.2,size*.6,0,size*.1);f.closePath();f.fill();f.stroke();f.strokeStyle='#392820';f.lineWidth=1;for(let k=0;k<7;k++){f.beginPath();f.moveTo(0,0);f.quadraticCurveTo(size*.3,-size*.3,size*(.14+k*.065),-size*(.55-k*.06));f.stroke();}f.restore();}f.fillStyle='#26241c';f.beginPath();f.ellipse(0,0,3,size*.2,0,0,7);f.fill();f.restore();}
function butterfly(x,y,size,time,angle,alpha){const flap=.13+.87*Math.abs(Math.cos(time*15));f.save();f.globalAlpha=alpha;f.translate(x,y);f.rotate(angle);f.shadowColor='#0006';f.shadowBlur=8;f.shadowOffsetY=7;
 if(sprite.complete&&sprite.naturalWidth){const iw=sprite.naturalWidth,ih=sprite.naturalHeight,h=size*ih/iw;f.save();f.scale(flap,1);f.drawImage(sprite,0,0,iw/2,ih,-size/2,-h/2,size/2,h);f.restore();f.save();f.scale(flap,1);f.drawImage(sprite,iw/2,0,iw/2,ih,0,-h/2,size/2,h);f.restore();f.shadowBlur=0;f.fillStyle='#24241d';f.beginPath();f.ellipse(0,0,Math.max(1,size*.014),size*.13,0,0,7);f.fill();}
 else{f.restore();fallbackButterfly(x,y,size,flap,angle);return;}f.restore();}
function animate(now){const dt=Math.min(.04,(now-(lastTime||now))/1000);lastTime=now;f.clearRect(0,0,innerWidth,innerHeight);if(!flight){lastTime=0;return;}const t=(now-flight.start)/1000;
 if(flight.kind==='lines'){animateLines(t,dt);return;}
 if(t<1.6){const pulse=Math.sin(t*8)*.2+.8;const rad=f.createRadialGradient(flight.x,flight.y,0,flight.x,flight.y,flight.size);rad.addColorStop(0,`rgba(255,226,151,${pulse*.28})`);rad.addColorStop(1,'rgba(255,226,151,0)');f.fillStyle=rad;f.beginPath();f.arc(flight.x,flight.y,flight.size,0,7);f.fill();canvas.style.opacity=String(1-Math.max(0,t-.65)*.75);}
 if(t>=1.05){const u=t-1.05,grow=Math.min(1,u/1.1),cx=flight.x,cy=flight.y;let x=cx,y=cy;
  if(u>1.1){const v=u-1.1;const targetX=innerWidth*.69,targetY=innerHeight*.29;const lerp=1-Math.exp(-v*.55);x=cx+(targetX-cx)*lerp+Math.sin(v*2)*Math.min(90,v*30);y=cy+(targetY-cy)*lerp-Math.sin(v*1.6)*38;if(v>5.5){x+=(v-5.5)*115;y-=(v-5.5)*100;}}
  const s=flight.size*(.5+grow*.7)*(1+Math.sin(u*.5)*.1);butterfly(x,y,s,u,-.18+Math.sin(u*1.9)*.2,Math.min(1,u*2));
  if(Math.random()<.6)particles.push({x,y,vx:(Math.random()-.5)*25,vy:20,life:1.2,age:0,size:1.2});
  if(t>2&&flight.phase==='awakening'){flight.phase='flying';strokes=[];persist();draw();canvas.style.opacity='1';totalBorn++;stage('당신의 나비가 날아올랐어요',2500);status('새로운 나비 한 마리가 태어났어요. 다시 그려볼까요?');emit('born',{count:totalBorn});}
 }
 particles=particles.filter(p=>{p.age+=dt;if(p.age>=p.life)return false;p.x+=p.vx*dt;p.y+=p.vy*dt;f.globalAlpha=(1-p.age/p.life)*.8;f.fillStyle='#ffe4a3';f.beginPath();f.arc(p.x,p.y,p.size,0,7);f.fill();f.globalAlpha=1;return true;});
 if(t>10){endFlight();return;}requestAnimationFrame(animate);
}
function endFlight(){const kind=flight.kind;flight=null;particles=[];f.clearRect(0,0,innerWidth,innerHeight);canvas.style.opacity='1';setBusy(false);lastTime=0;emit('complete',{type:kind});}
const clamp01=v=>Math.min(1,Math.max(0,v));
const smooth=v=>{v=clamp01(v);return v*v*(3-2*v);};
function launchLines(b){
 const p=b.pixels,pad=Math.ceil(8*dpr),sx=Math.max(0,p.minX-pad),sy=Math.max(0,p.minY-pad),sw=Math.min(canvas.width,p.maxX+pad+1)-sx,sh=Math.min(canvas.height,p.maxY+pad+1)-sy;
 const ink=document.createElement('canvas');ink.width=sw;ink.height=sh;ink.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
 const r=canvas.getBoundingClientRect(),x=r.left+(sx+sw/2)/dpr,y=r.top+(sy+sh/2)/dpr;
 flight={kind:'lines',start:performance.now(),x,y,w:sw/dpr,h:sh/dpr,ink,phase:'awakening',history:[],scrollX,scrollY};
 particles=[];setBusy(true);stage('그린 선이 칠판에서 들려 올라와요…',1800);status('색과 선 모양 그대로, 칠판에서 떨어져 나오는 중이에요.');chime();emit('awakening',{bounds:b,preserveDrawing:true});requestAnimationFrame(animate);
}
function inkPlane(x,y,scale,angle,alpha=1,glow=0,wingTime=0){
 f.save();f.translate(x,y);f.rotate(angle);f.scale(scale,scale);f.globalAlpha=alpha;
 const a=flight,amount=smooth((wingTime-.55)/.85);
 // Fold the user's actual ink around its center. The source colors and erased
 // gaps remain in the texture; every drawn line participates in the wing motion.
 if(amount<.001){if(glow){f.shadowColor='#fff1c580';f.shadowBlur=glow;}f.drawImage(a.ink,-a.w/2,-a.h/2,a.w,a.h);f.restore();return;}
 const phase=(wingTime-.55)*Math.PI*2*3.2;
 const sliceCount=40,step=a.w/sliceCount;
 const project=u=>{
  const side=u<0?-1:1,r=Math.abs(u)/(a.w/2);
  const beat=.5+.5*Math.sin(phase+side*.07);
  const theta=amount*(.12+beat*1.12);
  const bend=amount*Math.sin(phase-.9+r*1.1)*r*r;
  return{x:u*Math.cos(theta)*(1-.07*r*amount),y:Math.abs(u)*Math.sin(theta)*.20+bend*Math.min(a.w*.045,14)};
 };
 const stretchY=1-amount*.035*(.5+.5*Math.sin(phase));
 for(let i=0;i<sliceCount;i++){
  const u0=-a.w/2+i*step,u1=u0+step,p0=project(u0),p1=project(u1);
  f.save();f.transform((p1.x-p0.x)/step,(p1.y-p0.y)/step,0,stretchY,p0.x,p0.y-a.h*stretchY/2);
  // Tiny source overlap prevents hairline seams between the flexible strips.
  const srcX=i*a.ink.width/sliceCount,srcW=Math.min(a.ink.width-srcX,a.ink.width/sliceCount+.5);
  f.drawImage(a.ink,srcX,0,srcW,a.ink.height,0,0,srcW*a.w/a.ink.width,a.h);f.restore();
 }
 f.restore();
}
function animateLines(t,dt){
 const a=flight,originX=a.x+a.scrollX-scrollX,originY=a.y+a.scrollY-scrollY;
 const lift=smooth((t-.4)/1.35);let x=originX,y=originY-lift*52;
 // At takeoff the texture is still exactly 1:1 with the original canvas pixels.
 const fit=Math.min(1,innerWidth*.6/a.w,innerHeight*.42/a.h);let scale=1+lift*.12,angle=lift*-.045;
 if(t>1.75){const v=t-1.75,travel=smooth(v/1.75),orbitTime=Math.max(0,v-1.75);
  const targetX=innerWidth*.5,targetY=innerHeight*.38;
  x=originX+(targetX-originX)*travel+Math.sin(v*1.8)*Math.min(55,v*24);
  y=originY-52+(targetY-originY+52)*travel+Math.sin(v*2.2)*Math.min(24,v*11);
  scale=(1.12+(fit*1.24-1.12)*travel)*(1+Math.sin(orbitTime*1.4)*.035);
  angle=-.045+Math.sin(v*1.7)*.16;
  if(t>6.2){const exit=smooth((t-6.2)/2.5);x+=(innerWidth+a.w)*exit;y-=(innerHeight*.65+a.h)*exit;scale*=1-.32*exit;angle-=exit*.25;}
 }
 // The offset shadow stays on the board as the colored drawing lifts away.
 if(t<2.3&&lift>0){f.save();f.globalAlpha=.18*Math.sin(Math.min(1,t/2.3)*Math.PI);f.filter='blur(8px) brightness(0)';f.drawImage(a.ink,originX-a.w/2+lift*12,originY-a.h/2+lift*9,a.w,a.h);f.restore();}
 const wingBob=smooth((t-.7)/.8)*Math.sin((t-.55)*Math.PI*2*3.2-1)*3.5;
 y+=wingBob;
 if(t>2.3){
  for(const h of a.history){h.age+=dt;if(h.age<.26)inkPlane(h.x,h.y,h.scale,h.angle,.035*(1-h.age/.26),0,h.wingTime);}
  a.history=a.history.filter(h=>h.age<.26);
  if(!a.lastGhost||t-a.lastGhost>.1){a.history.push({x,y,scale,angle,wingTime:t,age:0});a.lastGhost=t;}if(a.history.length>2)a.history.shift();
 }
 if(t>=.4){canvas.style.opacity=String(1-smooth((t-.4)/.5));inkPlane(x,y,scale,angle,smooth((t-.4)/.5),lift*5,t);}
 if(t>=.9&&a.phase==='awakening'){a.phase='flying';strokes=[];persist();draw();canvas.style.opacity='1';totalBorn++;stage('그린 선이 나비처럼 날갯짓해요',2800);status('모든 선이 함께 접혔다 펼쳐지며 나비처럼 날고 있어요.');emit('born',{count:totalBorn,preserveDrawing:true,motion:'butterfly-flap'});}
 // Small chalk sparks are kept behind the original colored line texture.
 if(t>.8&&t<8&&Math.random()<.55)particles.push({x:x+(Math.random()-.5)*a.w*scale,y:y+(Math.random()-.5)*a.h*scale,vx:(Math.random()-.5)*12,vy:12+Math.random()*10,life:.8,age:0,size:.7});
 particles=particles.filter(p=>{p.age+=dt;if(p.age>=p.life)return false;p.x+=p.vx*dt;p.y+=p.vy*dt;f.save();f.globalAlpha=(1-p.age/p.life)*.5;f.fillStyle='#e4d6b2';f.beginPath();f.arc(p.x,p.y,p.size,0,7);f.fill();f.restore();return true;});
 if(t>9){status('그린 선이 나비처럼 날아갔어요. 다시 그려볼까요?');endFlight();return;}requestAnimationFrame(animate);
}
function syncMode(){const lines=$('#mode').value==='lines';$('#magicLabel').textContent=lines?'마법 부여하기':'생명 불어넣기';status(lines?'어떤 모양이든 그려보세요. 모든 선이 나비처럼 날갯짓합니다.':'나비를 그리거나 예제를 선택해 생명을 불어넣어 보세요.');}
$('#mode').onchange=syncMode;
$('#save').onclick=()=>{if(busy)return;const b=visibleBounds();if(!b){toast('먼저 그림을 그려주세요.');return;}const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const c=out.getContext('2d');c.fillStyle='#214631';c.fillRect(0,0,out.width,out.height);c.drawImage(canvas,0,0);out.toBlob(blob=>{if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='IOX_생명의칠판_'+new Date().toISOString().slice(0,10)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('그림을 PNG로 저장했습니다.');});};
const dialog=$('#helpDialog');$('#help').onclick=$('#about').onclick=()=>dialog.showModal();$('.close').onclick=$('.close-guide').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
window.addEventListener('resize',resize);new ResizeObserver(resize).observe(scene);
// Public integration API. No postMessage listener or cross-origin command execution.
window.IOXMagicBoard=Object.freeze({version:'2.0.0',sample,awaken,flyLines(){if(busy)return;$('#mode').value='lines';syncMode();awaken();},clear:()=>$('#clear').click(),exportDrawing:()=>JSON.parse(JSON.stringify(strokes)),importDrawing(data){if(busy||!Array.isArray(data))return false;const valid=data.every(s=>s&&typeof s.color==='string'&&/^#[0-9a-f]{6}$/i.test(s.color)&&Number.isFinite(s.width)&&s.width>0&&s.width<=100&&Array.isArray(s.points)&&s.points.length<=8000&&s.points.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1));if(!valid||data.length>400)return false;strokes=JSON.parse(JSON.stringify(data));persist();draw();return true;},getState:()=>({busy,totalBorn,strokes:strokes.length,mode:$('#mode').value})});
resize();syncMode();if(strokes.length)status('이 기기에서 그리던 그림을 불러왔습니다.');
})();

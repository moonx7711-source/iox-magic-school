'use strict';
(() => {
  const scene=document.querySelector('#crystal-experience');
  const stage=scene.querySelector('.crystal-stage');
  const touch=scene.querySelector('#touch-crystal');
  const replay=scene.querySelector('#replay-crystal');
  const message=scene.querySelector('#crystal-message');
  const light=scene.querySelector('#crystal-light');
  const lightCtx=light.getContext('2d');
  const pictures=[scene.querySelector('#crystal-room'),scene.querySelector('#crystal-card-scene')];
  let state='loading', loadSequence=0, revealTimer=0, lightFrame=0, lastStamp=0, elapsed=0;
  const REVEAL_MS=4600;

  function paintLight(ms){
    const c=lightCtx, S=600, t=ms/1000;
    c.clearRect(0,0,S,S);
    c.save();c.beginPath();c.arc(300,300,278,0,Math.PI*2);c.clip();
    c.globalCompositeOperation='screen';
    const strength=state==='revealing'?.9:state==='revealed'?.36:.57;
    const glow=c.createRadialGradient(300+Math.sin(t*.35)*70,315+Math.cos(t*.4)*60,0,300,300,260);
    glow.addColorStop(0,`rgba(94,174,255,${strength*.16})`);
    glow.addColorStop(.5,`rgba(151,107,233,${strength*.08})`);glow.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=glow;c.fillRect(0,0,S,S);
    for(let strand=0;strand<3;strand++){
      const phase=t*.42+strand*2.1;
      c.beginPath();
      for(let j=0;j<=110;j++){
        const u=j/110, a=u*Math.PI*2+phase;
        const x=300+Math.cos(a)*220*(.72+.16*Math.sin(u*Math.PI+phase));
        const y=310+Math.sin(a)*83+(u-.5)*170+Math.sin(phase)*30;
        if(j===0)c.moveTo(x,y);else c.lineTo(x,y);
      }
      const rgb=['104,213,255','178,131,255','255,207,124'][strand];
      c.strokeStyle=`rgba(${rgb},${strength*.48})`;c.lineWidth=1.4;
      c.shadowColor=`rgba(${rgb},.85)`;c.shadowBlur=13;c.stroke();
    }
    for(let i=0;i<34;i++){
      const a=i*2.39996+t*(.09+(i%4)*.025), r=48+((i*43)%202);
      const x=300+Math.cos(a)*r, y=300+Math.sin(a)*r*.8+Math.sin(t*.5+i)*12;
      const twinkle=.25+.75*Math.pow((Math.sin(t*1.1+i*1.8)+1)/2,3);
      const size=i%7===0?2:1;
      c.fillStyle=`rgba(255,225,164,${strength*twinkle})`;
      c.shadowColor='#d3eaff';c.shadowBlur=8;c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();
    }
    c.restore();
  }
  function stopLight(){cancelAnimationFrame(lightFrame);lightFrame=0;lastStamp=0;}
  function lightTick(stamp){
    lightFrame=0;
    if(!scene.open||document.hidden||reduced.matches)return;
    if(lastStamp)elapsed+=Math.min(stamp-lastStamp,50);
    lastStamp=stamp;paintLight(elapsed);lightFrame=requestAnimationFrame(lightTick);
  }
  function startLight(){
    if(!scene.open||document.hidden||state==='loading'||state==='error')return;
    if(reduced.matches){paintLight(0);return;}
    if(!lightFrame)lightFrame=requestAnimationFrame(lightTick);
  }
  function resetVision(){
    clearTimeout(revealTimer);revealTimer=0;
    state='idle';scene.classList.remove('revealing','revealed');
    touch.disabled=false;touch.setAttribute('aria-label','수정구를 터치해 마법사 카드 나타내기');
    replay.hidden=true;message.textContent='수정구를 터치해 보세요';
  }
  async function openCrystal(){
    if(scene.open)return;
    const sequence=++loadSequence;
    state='loading';scene.classList.remove('scene-ready','revealing','revealed');
    touch.disabled=true;replay.hidden=true;stage.setAttribute('aria-busy','true');
    message.textContent='수정구를 불러오는 중…';
    crystalActive=true;last=0;document.body.classList.add('crystal-open');
    scene.showModal();
    // Explicitly load lazy images when this otherwise hidden scene is opened.
    pictures.forEach(p=>{p.loading='eager';});
    try{
      await Promise.all(pictures.map(p=>p.decode()));
      if(!scene.open||sequence!==loadSequence)return;
      stage.setAttribute('aria-busy','false');scene.classList.add('scene-ready');
      resetVision();startLight();touch.focus({preventScroll:true});
    }catch(error){
      if(!scene.open||sequence!==loadSequence)return;
      state='error';stage.setAttribute('aria-busy','false');
      message.textContent='수정구 이미지를 불러오지 못했습니다. 돌아간 뒤 다시 열어 주세요.';
    }
  }
  function revealCard(){
    if(state!=='idle')return;
    state='revealing';touch.disabled=true;scene.classList.add('revealing');
    touch.setAttribute('aria-label','마법사 카드가 나타나는 중');
    message.textContent='빛 속에서 당신의 카드가 나타납니다';
    const complete=()=>{
      if(!scene.open||state!=='revealing')return;
      state='revealed';scene.classList.add('revealed');
      message.textContent='마법사 · The Magician';replay.hidden=false;
      touch.setAttribute('aria-label','수정구 속 마법사 카드');
    };
    if(reduced.matches)complete();else revealTimer=setTimeout(complete,REVEAL_MS);
  }
  wand.addEventListener('click',openCrystal);
  touch.addEventListener('click',revealCard);
  replay.addEventListener('click',()=>{resetVision();touch.focus({preventScroll:true});});
  scene.querySelector('#close-crystal').addEventListener('click',()=>scene.close());
  scene.addEventListener('close',()=>{
    ++loadSequence;clearTimeout(revealTimer);stopLight();
    scene.classList.remove('scene-ready','revealing','revealed');
    crystalActive=false;document.body.classList.remove('crystal-open');
    last=0;start();wand.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopLight();else startLight();});
  reduced.addEventListener('change',()=>{stopLight();startLight();});
})();

'use strict';
(() => {
  const ceremony=document.querySelector('#name-ceremony'),portal=document.querySelector('#library-portal');
  const stage=portal.querySelector('.library-stage'),door=document.querySelector('#open-library-door');
  const room=document.querySelector('#library-door-view'),status=document.querySelector('#library-door-status');
  const nameResult=ceremony.querySelector('.ceremony-result');
  const retry=document.querySelector('#retry-library-door'),replay=document.querySelector('#replay-library-door');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state='idle',sequence=0,assets=null,enterTimer=0,finishTimer=0,remaining=0,due=0;
  function loadAssets(){
    if(!assets){
      const closed=new Image();closed.src='assets/library-door-closed-v1.webp';
      assets=Promise.all([room.decode(),closed.decode()]).catch(e=>{assets=null;throw e;});
      // Begin loading during the name scene; surface errors only if the door is entered.
      assets.catch(()=>{});
    }
    return assets;
  }
  function stopTimers(){clearTimeout(enterTimer);clearTimeout(finishTimer);enterTimer=finishTimer=0;}
  function reset(){
    sequence++;stopTimers();remaining=0;state='idle';portal.hidden=true;ceremony.classList.remove('portal-active');
    stage.classList.remove('door-opening','door-open');portal.classList.remove('portal-arrived');
    door.hidden=false;door.disabled=true;door.setAttribute('aria-busy','false');retry.hidden=true;replay.hidden=true;status.textContent='';
    nameResult.removeAttribute('aria-hidden');room.setAttribute('aria-hidden','true');
  }
  async function ready(current){
    state='loading';door.disabled=true;retry.hidden=true;status.textContent='문을 불러오는 중…';
    try{
      await loadAssets();if(current!==sequence||!ceremony.open||portal.hidden)return;
      state='closed';door.disabled=false;status.textContent='';door.focus({preventScroll:true});
    }catch{
      if(current!==sequence||!ceremony.open)return;
      state='error';status.textContent='문 이미지를 불러오지 못했습니다.';retry.hidden=false;
    }
  }
  function enter(){
    enterTimer=0;remaining=0;if(!ceremony.open||state!=='waiting')return;
    portal.hidden=false;ceremony.classList.add('portal-active');
    nameResult.setAttribute('aria-hidden','true');
    requestAnimationFrame(()=>portal.classList.add('portal-arrived'));
    ready(sequence);
  }
  function scheduleEnter(ms){remaining=ms;due=performance.now()+ms;if(!document.hidden)enterTimer=setTimeout(enter,ms);}
  function finish(){
    finishTimer=0;if(!ceremony.open||state!=='opening')return;
    state='open';stage.classList.add('door-open');door.hidden=true;door.setAttribute('aria-busy','false');
    status.textContent='비밀 도서관의 문이 열렸습니다';replay.hidden=false;
    room.removeAttribute('aria-hidden');
    ceremony.dispatchEvent(new CustomEvent('magic:library-opened'));
  }
  function openDoor(){
    if(state!=='closed')return;
    state='opening';door.disabled=true;door.setAttribute('aria-busy','true');status.textContent='도서관 문이 열리고 있습니다';
    stage.classList.add('door-opening');
    if(reduced.matches)finish();else finishTimer=setTimeout(finish,5300);
  }
  for(let i=0;i<24;i++){
    const spark=document.createElement('i');spark.style.setProperty('--spark-x',(38+Math.random()*24)+'%');spark.style.setProperty('--spark-y',(20+Math.random()*36)+'%');
    spark.style.setProperty('--spark-dx',(-90+Math.random()*180)+'px');spark.style.setProperty('--spark-dy',(-60-Math.random()*150)+'px');spark.style.setProperty('--spark-delay',(Math.random()*.7)+'s');
    portal.querySelector('.portal-sparkles').append(spark);
  }
  ceremony.addEventListener('magic:name-start',()=>{reset();loadAssets();});
  ceremony.addEventListener('magic:name-revealed',()=>{state='waiting';scheduleEnter(2600);});
  ceremony.addEventListener('close',reset);
  door.addEventListener('click',openDoor);
  retry.addEventListener('click',()=>ready(sequence));
  replay.addEventListener('click',()=>{
    ceremony.dispatchEvent(new CustomEvent('magic:library-reset'));
    stopTimers();stage.classList.remove('door-opening','door-open');door.hidden=false;door.disabled=false;replay.hidden=true;
    status.textContent='';state='closed';door.focus({preventScroll:true});
    room.setAttribute('aria-hidden','true');
  });
  document.addEventListener('visibilitychange',()=>{
    if(state==='waiting'){
      if(document.hidden){clearTimeout(enterTimer);enterTimer=0;remaining=Math.max(0,due-performance.now());}
      else scheduleEnter(remaining);
    }
  });
  reduced.addEventListener('change',()=>{if(reduced.matches&&state==='opening'){clearTimeout(finishTimer);finish();}});
})();

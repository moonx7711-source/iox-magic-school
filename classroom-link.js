/* The inscription remains real ink on the page; a matching light plane invites touch. */
(() => {
 'use strict';
 const ceremony=document.querySelector('#name-ceremony'),plane=document.querySelector('.spellbook-float'),ink=plane.querySelector('.spellbook-name-ink');
 if(!ceremony||!ink)return;
 const light=document.createElement('canvas');light.width=ink.width;light.height=ink.height;light.className='book-name-light';light.setAttribute('aria-hidden','true');plane.append(light);
 const enter=document.createElement('button');enter.id='enter-art-classroom';enter.type='button';enter.hidden=true;enter.innerHTML='<span class="book-touch-cue" aria-hidden="true"><span>터치</span><svg viewBox="0 0 50 78"><path d="M25 5V66M9 49L25 67L41 49"/></svg></span>';plane.append(enter);
 let entering=false;
 function reset(){enter.hidden=true;enter.disabled=false;entering=false;plane.classList.remove('book-name-calling');light.getContext('2d').clearRect(0,0,light.width,light.height);}
 ceremony.addEventListener('magic:book-inscribed',e=>{
  const c=ink.getContext('2d'),p=c.getImageData(0,0,ink.width,ink.height);let x0=p.width,y0=p.height,x1=-1,y1=-1;
  for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3]>30){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<0)return;
  const lc=light.getContext('2d');lc.clearRect(0,0,light.width,light.height);lc.drawImage(ink,0,0);lc.globalCompositeOperation='source-in';lc.fillStyle='#ffdb8c';lc.fillRect(0,0,light.width,light.height);lc.globalCompositeOperation='source-over';
  const w=Math.max(140,x1-x0+60),h=Math.max(90,y1-y0+42),cx=(x0+x1)/2,cy=(y0+y1)/2;
  Object.assign(enter.style,{left:(cx-w/2)/ink.width*100+'%',top:(cy-h/2)/ink.height*100+'%',width:w/ink.width*100+'%',height:h/ink.height*100+'%'});
  enter.setAttribute('aria-label',(e.detail.name||'내')+' 이름을 터치하여 교실 입장');enter.hidden=false;plane.classList.add('book-name-calling');
  document.querySelector('#spellbook-status').textContent='책에 새겨진 이름이 빛납니다. 화살표가 가리키는 이름을 터치하여 교실에 입장하세요.';
  for(const name of ['classroom-wide-v2.png','classroom-close-v2.png']){const im=new Image();im.src='classroom/assets/'+name;}
 });
 enter.addEventListener('click',()=>{if(entering)return;entering=true;enter.disabled=true;ceremony.classList.add('classroom-entering');setTimeout(()=>{location.href=new URL('classroom/index.html?from=book',location.href).href;},matchMedia('(prefers-reduced-motion: reduce)').matches?0:420);});
 for(const evt of ['magic:name-start','magic:library-reset','close'])ceremony.addEventListener(evt,()=>{reset();ceremony.classList.remove('classroom-entering');});
})();

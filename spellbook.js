'use strict';
(() => {
  const ceremony=document.querySelector('#name-ceremony'),stage=document.querySelector('.library-stage');
  const scene=document.querySelector('#spellbook-scene'),room=document.querySelector('#spellbook-room'),book=document.querySelector('#spellbook-object');
  const lines=document.querySelector('#spellbook-lines'),tip=document.querySelector('#spellbook-writing-tip');
  const status=document.querySelector('#spellbook-status'),retry=document.querySelector('#retry-spellbook'),replay=document.querySelector('#replay-library-door');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  lines.replaceChildren();tip.style.display='none';
  document.querySelector('.spellbook-page-shade').style.display='none';
  const W=864,H=1536,NAME_X=673,BASELINE=1268,MAX_WIDTH=270,APPROACH_MS=6000,INK_START=6500,SOAK_MS=2300;
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
  canvas.className='spellbook-name-ink';canvas.setAttribute('aria-hidden','true');
  book.after(canvas);const ctx=canvas.getContext('2d');
  let assets=null,sequence=0,state='idle',frame=0,last=null,elapsed=0,complete=false,letters=[],name='',stagger=440,ink='#816b58';
  const clamp=value=>Math.max(0,Math.min(1,value));
  const smooth=value=>{const p=clamp(value);return p*p*(3-2*p);};
  function cleanName(value){
    return typeof value==='string'?value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/gu,'').replace(/\s+/gu,' ').trim():'';
  }
  function getName(){
    let value=cleanName(document.querySelector('#nickname').value);
    if(!value)try{value=cleanName(JSON.parse(localStorage.getItem('iox.magic-school.member.v1')||'null')?.name);}catch{}
    const characters=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(value),x=>x.segment):Array.from(value);
    return characters.slice(0,24);
  }
  function sampleInk(){
    // Convert the existing drawing's brown pigment to a paper-relative multiply colour.
    // Sampling failure keeps a warm brown fallback; it never prevents the scene.
    try{
      const sample=document.createElement('canvas');sample.width=W;sample.height=H;
      const sc=sample.getContext('2d',{willReadFrequently:true});sc.drawImage(book,0,0,W,H);
      const pixels=sc.getImageData(580,930,140,60).data,dark=[],paper=[];
      for(let i=0;i<pixels.length;i+=4){
        const lum=.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];
        if(lum<118&&lum>32)dark.push([pixels[i],pixels[i+1],pixels[i+2]]);
        if(lum>165)paper.push([pixels[i],pixels[i+1],pixels[i+2]]);
      }
      if(dark.length<20||paper.length<20)return;
      const mean=(list,c)=>list.reduce((sum,p)=>sum+p[c],0)/list.length;
      ink='rgb('+[0,1,2].map(c=>Math.round(Math.max(45,Math.min(210,255*mean(dark,c)/mean(paper,c))))).join(',')+')';
    }catch{}
  }
  function prepareName(){
    const characters=getName();name=characters.join('');
    const family=/[\u3131-\uD79D]/u.test(name)?'"Nanum Pen Script", "Gungsuh", serif':'"Invitation Script", "Classic Letter", cursive';
    let fontSize=56;ctx.font=fontSize+'px '+family;
    while(ctx.measureText(name).width>MAX_WIDTH&&fontSize>12){fontSize--;ctx.font=fontSize+'px '+family;}
    const widths=characters.map(c=>ctx.measureText(c).width),total=widths.reduce((a,b)=>a+b,0);
    let x=NAME_X-total/2;stagger=Math.min(440,3600/Math.max(1,characters.length-1));
    sampleInk();
    letters=characters.map((char,i)=>{
      const width=widths[i],pad=12,glyph=document.createElement('canvas');
      glyph.width=Math.ceil(width)+pad*2;glyph.height=fontSize*2+pad*2;
      const gc=glyph.getContext('2d',{willReadFrequently:true});
      gc.font=fontSize+'px '+family;gc.textBaseline='alphabetic';gc.fillStyle=ink;gc.fillText(char,pad,fontSize+pad);
      // Fixed microscopic gaps follow the parchment grain; do not shimmer between frames.
      const data=gc.getImageData(0,0,glyph.width,glyph.height);
      for(let py=0;py<glyph.height;py++)for(let px=0;px<glyph.width;px++){
        const a=(py*glyph.width+px)*4+3;
        const grain=((px*73+py*151+i*31)%101)/100;
        data.data[a]*=.78+grain*.22;
      }
      gc.putImageData(data,0,0);
      const letter={glyph,x:x-pad,width,baseline:fontSize+pad,pad};x+=width;return letter;
    });
    canvas.setAttribute('aria-label',name+' — 종이에 같은 갈색 잉크로 새겨진 이름');
  }
  function pageY(x){return BASELINE+11*Math.pow((x-NAME_X)/145,2);}
  function drawName(ms){
    ctx.clearRect(0,0,W,H);
    const time=reduced.matches?Infinity:Math.max(0,ms-INK_START);
    letters.forEach((letter,i)=>{
      const p=reduced.matches?1:smooth((time-i*stagger)/SOAK_MS);
      if(!p)return;
      ctx.save();ctx.globalAlpha=p*.96;
      // Two-pixel strips bend the whole glyph to the same gentle page curvature.
      // Opacity builds across each complete character, rather than a typing cursor/wipe.
      for(let sx=0;sx<letter.glyph.width;sx+=2){
        const x=letter.x+sx,w=Math.min(2,letter.glyph.width-sx);
        ctx.drawImage(letter.glyph,sx,0,w,letter.glyph.height,x,pageY(x)-letter.baseline,w,letter.glyph.height);
      }
      ctx.restore();
    });
    if((reduced.matches||time>Math.max(0,letters.length-1)*stagger+SOAK_MS)&&!complete){
      complete=true;stage.classList.add('book-ink-complete');
      status.textContent=name?name+' — 이름이 책의 빈칸에 갈색 잉크로 새겨졌습니다.':'책 앞으로 다가왔습니다.';
      ceremony.dispatchEvent(new CustomEvent('magic:book-inscribed',{detail:{name}}));
    }
  }
  function preload(){
    if(!assets){
      room.loading='eager';book.loading='eager';
      // Fonts are optional: offline devices can use their installed serif fonts.
      assets=Promise.all([room.decode(),book.decode(),document.fonts.load('56px "Invitation Script"').catch(()=>[]),document.fonts.load('56px "Nanum Pen Script"').catch(()=>[])]).catch(e=>{assets=null;throw e;});assets.catch(()=>{});
    }
    return assets;
  }
  function reset(){
    sequence++;cancelAnimationFrame(frame);frame=0;last=null;elapsed=0;complete=false;state='idle';scene.hidden=true;
    stage.classList.remove('book-approaching','book-arrived','book-ink-complete');
    for(const key of ['--book-approach','--book-fade','--book-lift','--book-tilt'])stage.style.removeProperty(key);
    ctx.clearRect(0,0,W,H);status.textContent='';retry.hidden=true;
  }
  function draw(ms){
    const approach=reduced.matches?1:clamp(ms/APPROACH_MS),progress=smooth(approach);
    stage.style.setProperty('--book-approach',String(progress));
    stage.style.setProperty('--book-fade',reduced.matches?'1':String(clamp((ms-1500)/4300)));
    const floatTime=Math.max(0,ms-APPROACH_MS);
    stage.style.setProperty('--book-lift',(reduced.matches?-3.4:-3.4*progress+(approach===1?Math.sin(floatTime/1450)*.22:0))+'%');
    stage.style.setProperty('--book-tilt',(reduced.matches?0:approach===1?Math.sin(floatTime/2200)*.12:0)+'deg');
    if(approach===1&&!stage.classList.contains('book-arrived')){
      stage.classList.add('book-arrived');replay.hidden=false;status.textContent='책의 빈칸에 이름이 서서히 잉크로 드러납니다.';
    }
    // Once dry, the canvas remains still; the shared page plane handles floating.
    if(!complete)drawName(ms);
  }
  function tick(stamp){
    frame=0;if(state!=='playing'||!ceremony.open||document.hidden)return;
    if(last!==null)elapsed+=Math.max(0,stamp-last);last=stamp;draw(elapsed);frame=requestAnimationFrame(tick);
  }
  async function start(){
    const current=++sequence;cancelAnimationFrame(frame);frame=0;state='loading';retry.hidden=true;replay.hidden=true;complete=false;
    stage.classList.remove('book-arrived','book-ink-complete');ctx.clearRect(0,0,W,H);
    try{
      await preload();if(current!==sequence||!ceremony.open)return;
      prepareName();scene.hidden=false;stage.classList.add('book-approaching');state='playing';elapsed=0;last=null;
      if(reduced.matches)draw(24000);else if(!document.hidden)frame=requestAnimationFrame(tick);
    }catch{
      if(current!==sequence||!ceremony.open)return;
      state='error';status.textContent='책 이미지를 불러오지 못했습니다.';retry.hidden=false;replay.hidden=false;
    }
  }
  ceremony.addEventListener('magic:name-start',()=>{reset();preload();});
  ceremony.addEventListener('magic:library-opened',start);
  ceremony.addEventListener('magic:library-reset',reset);
  ceremony.addEventListener('close',reset);retry.addEventListener('click',start);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frame);frame=0;last=null;}
    else if(state==='playing'&&!reduced.matches&&!frame)frame=requestAnimationFrame(tick);
  });
  reduced.addEventListener('change',()=>{
    if(state!=='playing')return;cancelAnimationFrame(frame);frame=0;last=null;
    if(reduced.matches)draw(24000);else if(!document.hidden)frame=requestAnimationFrame(tick);
  });
})();

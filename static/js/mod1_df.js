/* Mod 1 — proprioception-reactive diffusion forcing. The chunk denoises with a
   per-position ramp (front clean, back noise), sliding one action per step; every
   step re-reads fresh proprioception, while vision-language stays cached (age up to d_vlm). */
(function(){
  const cv=document.getElementById("m1-canvas"); if(!cv) return;
  const ctx=cv.getContext("2d");
  const elV=document.getElementById("m1-dvlm"), elVal=document.getElementById("m1-dvlmval");
  const H=16, green="#16a34a", blue="#2f6df0", dim="#9aa3ae", ink="#2b3038", track="#eef1f5";
  const S=1.4, STEP=1.5, DWELL=0.85; let dvlm=4, t=0, last=null, W=0, Ht=214;
  function ramp(i){return Math.max(0,1-(i+1)/H);}
  function tealFill(c){const a=[0xee,0xf1,0xf5],b=[0x0e,0x9e,0x8f];return`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*c)).join(",")})`;}
  function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function resize(){const dw=cv.clientWidth,dpr=devicePixelRatio||1;W=dw/S;cv.width=dw*dpr;cv.height=Ht*S*dpr;cv.style.height=(Ht*S)+"px";ctx.setTransform(dpr*S,0,0,dpr*S,0,0);}
  function pill(x,y,w,h,col,glow,title,sub){
    if(glow>0.02){ctx.save();ctx.shadowColor=col;ctx.shadowBlur=18*glow;rr(x,y,w,h,10);ctx.fillStyle="#fff";ctx.fill();ctx.restore();}
    rr(x,y,w,h,10);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=1.4+1.2*glow;ctx.strokeStyle=col;ctx.stroke();
    ctx.textAlign="center";ctx.fillStyle=col;ctx.font="700 12px Inter,sans-serif";ctx.fillText(title,x+w/2,y+h/2-2,w-12);
    ctx.fillStyle=dim;ctx.font="600 9.5px ui-monospace,monospace";ctx.fillText(sub,x+w/2,y+h/2+13,w-12);ctx.textAlign="left";
  }
  function draw(){
    ctx.clearRect(0,0,W,Ht);
    const ph=t%STEP, a0=ph<DWELL?0:(ph-DWELL)/(STEP-DWELL), adv=a0*a0*(3-2*a0), stepIdx=Math.floor(t/STEP);
    const cyc=((stepIdx%dvlm)+dvlm)%dvlm, vlmAge=dvlm+cyc, glowP=Math.max(0,1-ph*3), glowV=(cyc===0)?Math.max(0,1-ph*3):0;   // feature is already d_vlm old when it lands, so age >= d_vlm
    // diffusion-forcing buffer (ramp), slides one action per step
    const padL=16,padT=16,bBot=108,bw=(W-2*padL)/H,gap=3,cw=bw-gap,h=bBot-padT,ss=1;
    for(let i=0;i<H;i++){const bx=padL+i*bw;rr(bx,padT,cw,h,2);ctx.fillStyle=track;ctx.fill();}
    ctx.save();ctx.beginPath();ctx.rect(padL,padT-4,W-2*padL,h+8);ctx.clip();
    for(let j=0;j<=H+ss;j++){const pos=j-adv*ss,bx=padL+pos*bw;
      const cur=j>=H?0:ramp(j),tgt=(j-ss<0)?1:ramp(j-ss),lv=cur+(tgt-cur)*adv;
      if(lv<0.02)continue;const fh=Math.max(2,lv*h);
      ctx.fillStyle=lv>=0.985?"#0a7d70":tealFill(lv);rr(bx,padT+h-fh,cw,fh,2);ctx.fill();}
    ctx.restore();
    ctx.fillStyle=dim;ctx.font="600 9.5px ui-monospace,monospace";ctx.textAlign="center";
    ctx.fillText("per-position noise: front clean, back noise — one action emitted per step",W/2,bBot+14);ctx.textAlign="left";
    // two conditioning channels
    const py=bBot+26, pw=(W-2*padL-16)/2, pH=42;
    pill(padL,py,pw,pH,green,glowP,"Proprioception","fresh every step");
    pill(padL+pw+16,py,pw,pH,blue,glowV,"Vision-language","cached · age "+vlmAge);
    // readout
    ctx.textAlign="center";ctx.fillStyle=ink;ctx.font="600 12px Inter,sans-serif";
    ctx.fillText(`fresh proprioception every step; vision-language refreshes every ${dvlm} step${dvlm>1?"s":""}`,W/2,Ht-8);
  }
  function frame(ts){if(last==null)last=ts;const dt=Math.min(.05,(ts-last)/1000);last=ts;t+=dt;draw();requestAnimationFrame(frame);}
  function setV(v){dvlm=Math.max(1,+v);if(elVal)elVal.textContent=dvlm;}
  if(elV){elV.addEventListener("input",e=>setV(e.target.value));setV(elV.value);}
  addEventListener("resize",resize);resize();requestAnimationFrame(frame);
})();

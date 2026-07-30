/* Mod 2 — latency-adaptive staircase. Drag the delay slider to reshape it; the
   buffer slides continuously, emitting d clean actions per denoising step. */
(function(){
  const cv=document.getElementById("m2-canvas"); if(!cv) return;
  const ctx=cv.getContext("2d");
  const elD=document.getElementById("m2-d"), elV=document.getElementById("m2-dval");
  const H=16, teal="#0e9e8f", amber="#e0932a", dim="#222831", ink="#2b3038", track="#eef1f5";
  const S=1.4, STEP=1.7, DWELL=1.05; let d=2, t=0, last=null, W=0, Ht=196, visible=true, running=true;   // one denoising step per STEP seconds: hold (DWELL) then a single discrete slide-by-d
  function sched(i,dd){ if(dd<=0) return Math.max(0,1-(i+1)/H); if(i<dd) return 1; if(i<H-dd){const q=H-2*dd; return 1-(i-dd+1)/(q+1);} return 0; }
  function tealFill(c){const a=[0xee,0xf1,0xf5],b=[0x0e,0x9e,0x8f];return`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*c)).join(",")})`;}
  function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function resize(){const dw=cv.clientWidth,dpr=devicePixelRatio||1;W=dw/S;cv.width=dw*dpr;cv.height=Ht*S*dpr;cv.style.height=(Ht*S)+"px";ctx.setTransform(dpr*S,0,0,dpr*S,0,0);}
  function draw(){
    ctx.clearRect(0,0,W,Ht);
    const padL=16,padR=16,padT=20,barsBottom=Ht-52,bw=(W-padL-padR)/H,gap=3,cw=bw-gap,h=barsBottom-padT;
    const dd=Math.max(0,d),ss=Math.max(1,dd),ph=t%STEP,a0=ph<DWELL?0:(ph-DWELL)/(STEP-DWELL),adv=a0*a0*(3-2*a0);   // hold, then one discrete slide-by-ss (eased)
    for(let i=0;i<H;i++){const bx=padL+i*bw;rr(bx,padT,cw,h,2);ctx.fillStyle=track;ctx.fill();}
    ctx.save();ctx.beginPath();ctx.rect(padL,padT-4,W-padL-padR,h+8);ctx.clip();
    for(let j=0;j<=H+ss;j++){const pos=j-adv*ss,bx=padL+pos*bw;
      const cur=j>=H?0:sched(j,dd),tgt=(j-ss<0)?1:sched(j-ss,dd),lv=cur+(tgt-cur)*adv;
      if(lv<0.02)continue;const fh=Math.max(2,lv*h);
      ctx.fillStyle=lv>=0.985?amber:tealFill(lv);rr(bx,padT+h-fh,cw,fh,2);ctx.fill();}
    ctx.restore();
    // region brackets under the bars
    const y=barsBottom+7,x0=padL,xd=padL+dd*bw,xr=padL+(H-dd)*bw,xH=padL+H*bw;
    function region(a,b,label,col){ if(b-a<3)return; ctx.strokeStyle=col;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(a+1,y);ctx.lineTo(b-1,y);ctx.stroke();
      ctx.beginPath();ctx.moveTo(a+1,y-3);ctx.lineTo(a+1,y+3);ctx.moveTo(b-1,y-3);ctx.lineTo(b-1,y+3);ctx.stroke();
      ctx.fillStyle=col;ctx.textAlign="center";const cx=(a+b)/2,w=b-a;
      ctx.font="600 10px ui-monospace,monospace";
      if(w>ctx.measureText(label).width+6){ctx.fillText(label,cx,y+15);}
      else{const pp=label.split(" ");ctx.font="600 9px ui-monospace,monospace";   // narrow region: wrap to 2 lines
        if(pp.length>1&&w>Math.max(ctx.measureText(pp[0]).width,ctx.measureText(pp[1]).width)+3){ctx.fillText(pp[0],cx,y+12);ctx.fillText(pp[1],cx,y+22);}}}
    if(dd>0)region(x0,xd,"clean front",amber);
    region(xd,xr,"ramp",teal);
    if(dd>0)region(xr,xH,"noise tail",dim);
    // readout
    ctx.textAlign="center";ctx.fillStyle=ink;ctx.font="600 12.5px Inter,sans-serif";
    ctx.fillText(dd===0?"d = 0 (no delay): a plain ramp, one clean action per step":`d = ${dd}: emits ${dd} clean action${dd>1?"s":""} per denoising step, at any latency`,W/2,Ht-7);
  }
  function frame(ts){if(last==null)last=ts;const dt=Math.min(.05,(ts-last)/1000);last=ts;t+=dt;draw();if(visible)requestAnimationFrame(frame);else running=false;}
  function setD(v){d=+v;if(elV)elV.textContent=d;}
  if(elD){elD.addEventListener("input",e=>setD(e.target.value));setD(elD.value);}
  addEventListener("resize",resize);resize();requestAnimationFrame(frame);
  if("IntersectionObserver" in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!running){running=true;last=null;requestAnimationFrame(frame);}},{threshold:0}).observe(cv);   // pause when off-screen
})();

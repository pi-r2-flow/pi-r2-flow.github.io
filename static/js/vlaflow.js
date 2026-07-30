/* Inference pipeline, standard VLA -> piR2 (toggle: mode 0 standard, 1 = +Mod1, 2 = +Mod2). */
function mkFlow(opts){
  const cv=document.getElementById(opts.canvas); if(!cv) return;
  const ctx=cv.getContext("2d");
  const cc=document.getElementById("flow-compare"),cctx=cc&&cc.getContext("2d");
  const ink="#2b3038",dim="#222831",blue="#2f6df0",teal="#0e9e8f",amber="#e0932a",red="#c2452f",green="#16a34a",pink="#e0568f",arw="#7b74e0",line="#dfe4ea",bg="#ffffff";
  const K=4,H=16,hStd=8,DVLM=2,lerp=(a,b,t)=>a+(b-a)*t;   // DVLM = synchronous VLM cost (ticks)
  let dd=1,dRTC=6,dMod2=3,dPiR2=2;                        // inference delay d (slider) sets the in-flight fronts
  function recompD(){dRTC=Math.min(H-2,K*dd+DVLM);dMod2=Math.min(H-2,dd+DVLM);dPiR2=Math.max(1,dd);}   // RTC K steps+VLM ; Mod2 1 step+sync VLM ; piR2 1 step (async VLM)
  function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function tealFill(c){const a=[0xdd,0xf3,0xef],b=[0x0e,0x9e,0x8f];return`rgb(${a.map((v,i)=>Math.round(v+(b[i]-v)*c)).join(",")})`;}
  function phaseAt(PH,tt){const T=PH.reduce((s,p)=>s+p[1],0),m=tt%T;let acc=0;for(const p of PH){if(m<acc+p[1])return[p[0],(m-acc)/p[1]];acc+=p[1];}return[PH[PH.length-1][0],1];}
  // phase durations are in CONTROL TICKS so execution runs at the same control frequency across methods
  const PH0=[["o2v",.5],["vlm",2],["v2d",.4],["den",4],["d2e",.4],["exe",hStd],["loop",3]];   // standard: stalls during compute, then executes h ticks
  const T0=PH0.reduce((s,p)=>s+p[1],0);
  const PHR=[["o2v",.5],["vlm",2],["v2d",.4],["den",4],["d2e",.4],["loop",3]];                 // RTC: execution overlaps compute (no separate exe phase), K denoise steps
  const PH2=[["o2v",.5],["vlm",2],["v2d",.4],["den",1],["d2e",.4],["loop",3]];                 // Mod 2: sync VLM but only ONE denoise step (staircase), so a shorter cycle than RTC
  const S=1.35;let mode=(opts.fixedMode!=null?opts.fixedMode:0),t=0,last=null,Wl=0,Hl=220,ct=0,cWl=0,hit=null,hov=null,visible=true,running=true;   // ct = shared control-tick clock for the comparison strip

  function resize(){const dispW=cv.clientWidth,dpr=devicePixelRatio||1;Wl=dispW/S;cv.width=dispW*dpr;cv.height=Hl*S*dpr;cv.style.height=(Hl*S)+"px";ctx.setTransform(dpr*S,0,0,dpr*S,0,0);draw();}
  function frame(ts){if(last==null)last=ts;const dt=Math.min(.05,(ts-last)/1000);last=ts;t+=dt*(((mode===1||mode===4)?0.35:1.0));ct+=dt*1.8;draw();cdraw();if(visible)requestAnimationFrame(frame);else running=false;}   // streaming (1,4) vs pipeline tick-rate (0,2,3), overall ~0.5x
  function cresize(){if(!cc)return;const dw=cc.clientWidth,dpr=devicePixelRatio||1,cs=1.15;cWl=dw/cs;cc.width=dw*dpr;cc.height=176*cs*dpr;cc.style.height=(176*cs)+"px";cctx.setTransform(dpr*cs,0,0,dpr*cs,0,0);}
  function cdraw(){if(!cc)return;const x=cctx,W=cWl,H=176;x.clearRect(0,0,W,H);x.fillStyle=bg;x.fillRect(0,0,W,H);
    const R=[["Synchronous Inference",K*dd+DVLM,"#c2452f"],["Train-Time RTC",K*dd+DVLM,pink],["Mod 1 (d=0)",1,blue],["Mod 2",dd+DVLM,teal],["πR² (both)",dd,"#0e9e8f"]];
    const padX=12,labW=124,trackX=padX+labW,trackW=W-trackX-74,rowH=30,top=10,ppt=11;
    for(let i=0;i<R.length;i++){const name=R[i][0],intv=R[i][1],col=R[i][2],y=top+i*rowH+rowH/2,fast=intv<=dd+0.01;
      x.textAlign="left";x.fillStyle=col;x.font="700 11px Inter,sans-serif";x.fillText(name,padX,y+4,labW-6);
      x.fillStyle="#eef1f5";x.beginPath();x.rect(trackX,y-6,trackW,12);x.fill();
      x.save();x.beginPath();x.rect(trackX,y-9,trackW,18);x.clip();
      for(let k=Math.max(0,Math.floor((ct-trackW/ppt)/intv));k*intv<=ct+0.001;k++){const px=trackX+trackW-(ct-k*intv)*ppt;
        x.fillStyle=col;x.beginPath();x.rect(px-2,y-6,4,12);x.fill();}
      x.restore();
      x.fillStyle=fast?"#0a7d70":dim;x.font="600 10px Inter,sans-serif";x.fillText(fast?"every step":Math.round(intv/dd)+"x slower",trackX+trackW+8,y+4);}
    x.strokeStyle="#c8cfd8";x.lineWidth=1.2;x.beginPath();x.moveTo(trackX+trackW,top-2);x.lineTo(trackX+trackW,top+R.length*rowH-6);x.stroke();
    x.textAlign="right";x.fillStyle=dim;x.font="600 9px Inter,sans-serif";x.fillText("now",trackX+trackW,top+R.length*rowH+4);x.textAlign="left";
  }

  function box(r,title,sub,color,active){const [x,y,w,h]=r;   // idle boxes keep a milder version of their own colour (no grey)
    ctx.save();ctx.shadowColor=active?color:"rgba(24,32,52,0.16)";ctx.shadowBlur=active?15:7;ctx.shadowOffsetY=active?0:1.5;rr(x,y,w,h,12);ctx.fillStyle="#fff";ctx.fill();ctx.restore();
    rr(x,y,w,h,12);ctx.fillStyle="#fff";ctx.fill();ctx.lineWidth=active?2.4:1.6;ctx.strokeStyle=active?color:color+"aa";ctx.stroke();
    ctx.textAlign="center";
    if(title){ctx.fillStyle=color;ctx.font="700 13px Inter,sans-serif";ctx.fillText(title,x+w/2,y+h/2+(sub?-1:5),w-14);}
    if(sub){ctx.fillStyle=dim;ctx.font="600 10px Inter,sans-serif";ctx.fillText(sub,x+w/2,y+h/2+15,w-14);}
    ctx.textAlign="left";}
  const ORDER=["o2v","vlm","v2d","den","d2e","exe","loop"];
  function apr(ap,ph,f){const ai=ORDER.indexOf(ap),ci=ORDER.indexOf(ph);return ci===ai?f:0;}   // coloured only while the pulse is on this arrow; grey otherwise
  function arrow(x1,y,x2,color,prog){prog=(prog==null)?0:Math.max(0,Math.min(1,prog));
    ctx.strokeStyle="#6b7686";ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2-6,y);ctx.stroke();
    ctx.fillStyle="#6b7686";ctx.beginPath();ctx.moveTo(x2,y);ctx.lineTo(x2-8,y-5);ctx.lineTo(x2-8,y+5);ctx.closePath();ctx.fill();
    if(prog>0.02){const xe=x1+(x2-6-x1)*prog;ctx.strokeStyle=color;ctx.lineWidth=2.6;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(xe,y);ctx.stroke();
      if(prog<0.82)dot(xe,y,color);
      else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x2,y);ctx.lineTo(x2-8,y-5);ctx.lineTo(x2-8,y+5);ctx.closePath();ctx.fill();}}}
  function dot(x,y,c){ctx.beginPath();ctx.arc(x,y,5,0,7);ctx.fillStyle=c;ctx.fill();
    ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.stroke();ctx.globalAlpha=1;}
  function pathPoint(pts,p){p=Math.max(0,Math.min(1,p));let tot=0,segs=[];for(let i=0;i<pts.length-1;i++){const l=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);segs.push(l);tot+=l;}
    let tg=p*tot,acc=0;for(let i=0;i<pts.length-1;i++){if(acc+segs[i]>=tg){const r=segs[i]?(tg-acc)/segs[i]:0;return[pts[i][0]+(pts[i+1][0]-pts[i][0])*r,pts[i][1]+(pts[i+1][1]-pts[i][1])*r];}acc+=segs[i];}return pts[pts.length-1];}
  function ahead(a,b,color){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]);ctx.save();ctx.translate(b[0],b[1]);ctx.rotate(ang);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(-8,-4.5);ctx.lineTo(-8,4.5);ctx.closePath();ctx.fill();ctx.restore();}
  // multi-segment arrow: grey when idle, coloured up to `prog` with a leading dot when active
  function arrowPath(pts,color,prog,noBase,keepDot){prog=(prog==null)?0:Math.max(0,Math.min(1,prog));const n=pts.length;
    if(!noBase){ctx.strokeStyle="#6b7686";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<n;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.stroke();ahead(pts[n-2],pts[n-1],"#6b7686");}
    if(prog>0.02){let tot=0,segs=[];for(let i=0;i<n-1;i++){const l=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);segs.push(l);tot+=l;}
      const tg=prog*tot;let acc=0,dx=pts[0][0],dy=pts[0][1];
      ctx.strokeStyle=color;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=0;i<n-1;i++){const l=segs[i];if(acc+l<=tg){ctx.lineTo(pts[i+1][0],pts[i+1][1]);dx=pts[i+1][0];dy=pts[i+1][1];acc+=l;}else{const r=l?(tg-acc)/l:0;dx=pts[i][0]+(pts[i+1][0]-pts[i][0])*r;dy=pts[i][1]+(pts[i+1][1]-pts[i][1])*r;ctx.lineTo(dx,dy);break;}}
      ctx.stroke();if(prog<0.95||keepDot)dot(dx,dy,color);else ahead(pts[n-2],pts[n-1],color);}}
  function schedLevel(i,m){if(m===2||m===4){const d=(m===4?dPiR2:dMod2);if(i<d)return 1;if(i<H-d){const q=H-2*d;return 1-(i-d+1)/(q+1);}return 0;}
    if(m===3){return i<dRTC?1:0.5;}   // Train-Time RTC: clean front, one shared noise level on the rest
    return Math.max(0,1-(i+1)/H);}    // m===1: streaming ramp (d=0)

  // ---- chunk-bar cluster (H bars at given levels) ----
  function bars(x,y,w,h,levelFn,frontClean){const padL=10,gap=3,step0=(w-2*padL+gap)/H,cw=step0-gap;
    for(let i=0;i<H;i++){const bx=x+padL+i*step0,lv=levelFn(i);
      rr(bx,y,cw,h,2);ctx.fillStyle="#eef1f5";ctx.fill();
      if(lv>0.02){const fh=Math.max(2,lv*h);rr(bx,y+h-fh,cw,fh,2);ctx.fillStyle=(frontClean&&i<frontClean&&lv>=.99)?amber:tealFill(lv);ctx.fill();}}}
  // streaming buffer: bars slide left by `adv`, front denoises to clean and emits, fresh noise slides in at the back
  function streamBars(x,y,w,h,m,adv,ss){ss=ss||1;const padL=10,gap=3,step0=(w-2*padL+gap)/H,cw=step0-gap;   // ss = actions emitted per step (advance by ss notches)
    for(let i=0;i<H;i++){rr(x+padL+i*step0,y,cw,h,2);ctx.fillStyle="#eef1f5";ctx.fill();}
    ctx.save();ctx.beginPath();ctx.rect(x+padL,y-2,H*step0-gap,h+4);ctx.clip();
    for(let j=0;j<=H+ss;j++){const pos=j-adv*ss,bx=x+padL+pos*step0;
      const cur=j>=H?0:schedLevel(j,m),tgt=(j-ss<0)?1:schedLevel(j-ss,m),lv=lerp(cur,tgt,adv);
      if(lv<0.02)continue;const fh=Math.max(2,lv*h);
      ctx.fillStyle=lv>=0.985?amber:tealFill(lv);rr(bx,y+h-fh,cw,fh,2);ctx.fill();}
    ctx.restore();}

  // observation inputs: state (green, feeds the denoiser directly) + image/text (blue, feeds the VLM)
  function obsIn(x0,w0,x2,w2,by,bh,sp){
    const oc=x0+w0/2,oy=by+bh/2+15;
    ctx.font="600 9.5px Inter,sans-serif";ctx.textBaseline="alphabetic";
    ctx.textAlign="center";ctx.fillStyle=dim;ctx.fillText("state · image, text",oc,oy,w0-6);
    // state also conditions the denoiser, routed above the boxes
    const yT=by-25,ox=x0+w0/2,dx2=x2+w2/2;
    arrowPath([[ox,by-2],[ox,yT],[dx2,yT],[dx2,by-7]],green,sp,false,true);   // land just above the denoiser so the dot isn't covered by the box
    ctx.fillStyle=green;ctx.font="600 10.5px Inter,sans-serif";ctx.textAlign="center";ctx.fillText("state",(ox+dx2)/2,yT-4);ctx.textAlign="left";
  }

  // ===== Mode 0: standard VLA =====
  function drawStd(){const W=Wl,Ht=Hl;ctx.clearRect(0,0,W,Ht);if(!window.__flowTransparent){ctx.fillStyle=bg;ctx.fillRect(0,0,W,Ht);}
    const padX=14,aw=24,by=60,bh=82,avail=W-2*padX-3*aw,u=avail/4.85;
    const w0=1.2*u,w1=u,w2=1.55*u,w3=1.1*u,x0=padX,x1=x0+w0+aw,x2=x1+w1+aw,x3=x2+w2+aw,cy=by+bh/2;
    const [ph,f]=phaseAt(PH0,t);
    arrow(x0+w0,cy,x1,blue,apr("o2v",ph,f));arrow(x1+w1,cy,x2,teal,apr("v2d",ph,f));arrow(x2+w2,cy,x3,amber,apr("d2e",ph,f));
    box([x0,by,w0,bh],"Observation","",arw,ph==="o2v");obsIn(x0,w0,x2,w2,by,bh,ph==="o2v"?f*0.5/2.9:ph==="vlm"?(0.5+f*2)/2.9:ph==="v2d"?(2.5+f*0.4)/2.9:ph==="den"?1:0);
    box([x1,by,w1,bh],"VLM","image + text",blue,ph==="vlm");if(ph==="vlm"){const bx=x1+10,byy=by+bh-9,bw=w1-20;rr(bx,byy,bw,4,2);ctx.fillStyle="#e6edfb";ctx.fill();rr(bx,byy,Math.max(2,bw*f),4,2);ctx.fillStyle=blue;ctx.fill();}
    // denoise box: whole chunk, K discrete steps
    box([x2,by,w2,bh],"","",teal,ph==="den");
    ctx.textAlign="center";ctx.fillStyle=teal;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText("Iterative Denoising (K=4)",x2+w2/2,by+15,w2-14);
    let step=ph==="den"?Math.min(K,Math.floor(f*K)+1):(ph==="d2e"||ph==="exe")?K:0,lvl;
    if(ph==="den"){const s=f*K,k=Math.min(K-1,Math.floor(s)),lo=s-k,tr=lo<.5?0:(lo-.5)/.5,e=tr<.5?2*tr*tr:1-Math.pow(-2*tr+2,2)/2;lvl=(k+e)/K;}else lvl=(ph==="d2e"||ph==="exe")?1:0;
    ctx.fillStyle=dim;ctx.font="600 9.5px Inter,sans-serif";ctx.fillText(ph==="den"?`whole chunk · step ${step}/${K}`:(step===K?"whole chunk · clean":"whole chunk · noise"),x2+w2/2,by+bh-7,w2-14);
    bars(x2,by+22,w2,bh-40,()=>lvl,0);ctx.textAlign="left";
    // execute box: consume the chunk open-loop
    box([x3,by,w3,bh],"","",amber,ph==="exe");
    ctx.textAlign="center";ctx.fillStyle=amber;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText("Execute",x3+w3/2,by+15,w3-14);
    // discrete: executes the h sub-chunk one action per tick; empty (stall) during VLM + denoise
    const filled=ph==="exe"?Math.round(f*hStd):0;
    const tx=x3+10,tw=w3-20,ty=by+36,th=14,sg=3,sw=(tw-(hStd-1)*sg)/hStd;
    for(let i=0;i<hStd;i++){const sx=tx+i*(sw+sg);rr(sx,ty,sw,th,3);ctx.fillStyle="#f2ede6";ctx.fill();
      if(i<filled){rr(sx,ty,sw,th,3);ctx.fillStyle=amber;ctx.fill();}}
    ctx.fillStyle=dim;ctx.font="600 9px Inter,sans-serif";ctx.fillText(`${filled}/${H} (sub-chunk)`,x3+w3/2,ty+29,w3-16);
    ctx.fillStyle="#b06a1a";ctx.font="600 9px Inter,sans-serif";ctx.fillText("open-loop",x3+w3/2,ty+41,w3-16);ctx.textAlign="left";
    // loopback
    const lx1=x3+w3/2,lx2=x0+w0/2,yb=by+bh,yc=yb+40,ot=by+bh;
    arrowPath([[lx1,yb],[lx1,yc],[lx2,yc],[lx2,ot]],arw,ph==="loop"?Math.max(0,(f-0.35)/0.65):0,true);
    ctx.textAlign="left";
    
    
  }

  // ===== Modes 1 & 2: piR2 =====
  function drawMod(m){const W=Wl,Ht=Hl;ctx.clearRect(0,0,W,Ht);if(!window.__flowTransparent){ctx.fillStyle=bg;ctx.fillRect(0,0,W,Ht);}
    const padX=14,aw=24,by=100,bh=84,avail=W-2*padX-2*aw,u=avail/4.6,pw=1.1*u,hw=2.1*u,ew=1.4*u;
    const px=padX,hx=px+pw+aw,ex=hx+hw+aw,cy=by+bh/2;
    const cp=t%1;                                                     // one call per cycle: hold, advance one notch, hold
    let adv;if(cp<0.30)adv=0;else if(cp<0.65){const uu=(cp-0.30)/0.35;adv=uu<.5?2*uu*uu:1-Math.pow(-2*uu+2,2)/2;}else adv=1;
    const p2h=cp<0.30,stepP=cp>=0.30&&cp<0.65,h2e=cp>=0.65&&cp<0.85,lp=cp>=0.85;
    const vc=(m===2)?"#b9c0c9":blue;   // Mod 2 isolates the schedule (dim VLM); Mod 1 and piR2 keep it bright
    // async VLM box above the head + dashed feed
    const vw=hw*0.72,vh=46,vx=hx+(hw-vw)/2,vy=24;
    if(opts.jump&&m===4)hit={m1:[px,by-18,pw,bh+18],v1:[vx,vy-18,vw,vh+18],m2:[hx,by-18,hw,bh+18]};   // proprioception + async VLM -> Mod 1 ; action head (staircase) -> Mod 2
    ctx.setLineDash([5,4]);ctx.strokeStyle=vc;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(vx+vw/2,vy+vh);ctx.lineTo(vx+vw/2,by);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=vc;ctx.beginPath();ctx.moveTo(vx+vw/2,by);ctx.lineTo(vx+vw/2-5,by-8);ctx.lineTo(vx+vw/2+5,by-8);ctx.closePath();ctx.fill();
    box([vx,vy,vw,vh],"VLM  ·  async","image + text, cached",vc,false);
    ctx.textAlign="left";
    // arrows prop -> head -> execute
    arrow(px+pw,cy,hx,green,cp<0.3?cp/0.3:0);arrow(hx+hw,cy,ex,amber,(cp>=0.65&&cp<0.85)?(cp-0.65)/0.2:0);
    box([px,by,pw,bh],"Proprioception","fresh every step",green,p2h);
    // action head: STREAMING schedule; each step feeds fresh proprioception, advances the buffer one notch
    box([hx,by,hw,bh],"","",teal,stepP);
    ctx.textAlign="center";ctx.fillStyle=teal;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText("Iterative Denoising (K=1)",hx+hw/2,by+15,hw-14);
    ctx.fillStyle=dim;ctx.font="600 9.5px Inter,sans-serif";ctx.fillText(m===4?"clean front + ramping noise schedule":m===2?"clean front (inpaint) + ramp + noise tail":"streaming ramp · fresh proprioception every step",hx+hw/2,by+bh-7,hw-14);
    streamBars(hx,by+22,hw,bh-40,m,adv,m===4?dPiR2:1);ctx.textAlign="left";if(stepP)dot(hx,cy,green);   // fresh proprioception conditioning, drawn on top of the head
    // execute: in-flight actions run continuously, overlapping the denoising step (no stall)
    const nEx=m===4?dPiR2:1;
    box([ex,by,ew,bh],"","",amber,m===4?true:(h2e||lp));   // piR2: always executing (overlaps inference). Mod 1 (d=0): fires per step, no overlap
    ctx.textAlign="center";ctx.fillStyle=amber;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText("Execute",ex+ew/2,by+15,ew-14);
    const etx=ex+10,etw=ew-20,ety=by+33,eth=13,esg=4,esw=(etw-(nEx-1)*esg)/nEx,eprog=cp*nEx;   // continuous: in-flight actions execute nonstop
    for(let i=0;i<nEx;i++){const sx=etx+i*(esw+esg);rr(sx,ety,esw,eth,3);ctx.fillStyle="#f7efe4";ctx.fill();const fr=m===4?Math.max(0,Math.min(1,eprog-i)):((h2e||lp)?1:0);if(fr>0.02){rr(sx,ety,esw*fr,eth,3);ctx.fillStyle=amber;ctx.fill();}}
    ctx.fillStyle=dim;ctx.font="600 9px Inter,sans-serif";ctx.fillText(m===4?`${nEx} in-flight`:"1 action / step",ex+ew/2,ety+30,ew-16);
    ctx.fillStyle=m===4?"#b06a1a":"#0a7d70";ctx.font="600 9px Inter,sans-serif";ctx.fillText(m===4?"during inference":"reacts each step",ex+ew/2,ety+40,ew-16);ctx.textAlign="left";
    // tight loopback (teal, every step)
    const lx1=ex+ew/2,lx2=px+pw/2,yb=by+bh,yc=yb+30,ot=by+bh;
    arrowPath([[lx1,yb],[lx1,yc],[lx2,yc],[lx2,ot]],arw,cp>=0.35?Math.min(1,(cp-0.35)/0.65):0,true);
    ctx.textAlign="left";
    // pulses synced to the step
    
    
    
    const vf=(t*1.43)%1;ctx.globalAlpha=m===2?.35:.8;dot(vx+vw/2,lerp(vy+vh,by,vf),vc);ctx.globalAlpha=1;   // async VLM forward: same wall-clock as the sync VLM forward (2 ticks @ pipeline rate, streaming plays 0.35x)
    if(opts.jump&&m===4&&hov){const gb=(x,y,w,h,col)=>{rr(x,y,w,h,12);ctx.fillStyle=col;ctx.globalAlpha=.07;ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=col;ctx.lineWidth=2.8;ctx.stroke();};   // hover a block -> light tint + crisp border, clickable
      const hc=hov==="m1"?green:teal;
      if(hov==="m1"){gb(px,by,pw,bh,green);gb(vx,vy,vw,vh,green);}else{gb(hx,by,hw,bh,teal);}
      ctx.fillStyle=hc;ctx.font="700 11px Inter,sans-serif";ctx.textAlign="left";ctx.fillText(hov==="m1"?"click → Proprioception-reactive diffusion forcing":"click → Latency-adaptive noise schedule",padX,14);}
  }

  // ===== Modes 2 & 3: clamped-front pipeline with SYNC VLM.  m=2 Mod-2 staircase (1 step); m=3 Train-Time RTC (K steps) =====
  function drawClamp(m){const W=Wl,Ht=Hl;ctx.clearRect(0,0,W,Ht);if(!window.__flowTransparent){ctx.fillStyle=bg;ctx.fillRect(0,0,W,Ht);}
    const padX=14,aw=24,by=60,bh=82,avail=W-2*padX-3*aw,u=avail/4.85;
    const w0=1.2*u,w1=u,w2=1.55*u,w3=1.1*u,x0=padX,x1=x0+w0+aw,x2=x1+w1+aw,x3=x2+w2+aw,cy=by+bh/2;
    const rtc=(m===3),d=rtc?dRTC:dMod2,ac=teal,denT=rtc?4:1;   // denoise box teal in every method (same component, same colour)
    const denEnd=0.5+2+0.4+4;                            // RTC: o2v+vlm+v2d+den — denoising completes (execute hand-off) here
    const tR=rtc?t+denEnd+0.4:t;                         // RTC: open the loop just AFTER the hand-off (past the d2e full-green frame), so the first frame is a fresh chunk starting to execute, not a finished denoise
    const [ph,f]=phaseAt(rtc?PHR:PH2,tR);
    arrow(x0+w0,cy,x1,blue,apr("o2v",ph,f));arrow(x1+w1,cy,x2,teal,apr("v2d",ph,f));arrow(x2+w2,cy,x3,amber,apr("d2e",ph,f));
    box([x0,by,w0,bh],"Observation","",arw,ph==="o2v");obsIn(x0,w0,x2,w2,by,bh,ph==="o2v"?f*0.5/2.9:ph==="vlm"?(0.5+f*2)/2.9:ph==="v2d"?(2.5+f*0.4)/2.9:ph==="den"?1:0);
    box([x1,by,w1,bh],"VLM","image + text",blue,ph==="vlm");if(ph==="vlm"){const bx=x1+10,byy=by+bh-9,bw=w1-20;rr(bx,byy,bw,4,2);ctx.fillStyle="#e6edfb";ctx.fill();rr(bx,byy,Math.max(2,bw*f),4,2);ctx.fillStyle=blue;ctx.fill();}
    box([x2,by,w2,bh],"","",ac,ph==="den");
    ctx.textAlign="center";ctx.fillStyle=ac;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText(rtc?"Iterative Denoising (K=4)":"Iterative Denoising (K=1)",x2+w2/2,by+15,w2-14);
    ctx.fillStyle=dim;ctx.font="600 9px Inter,sans-serif";
    if(rtc){let step=ph==="den"?Math.min(K,Math.floor(f*K)+1):(ph==="d2e")?K:0,lvl;
      if(ph==="den"){const s=f*K,k=Math.min(K-1,Math.floor(s)),lo=s-k,tr=lo<.5?0:(lo-.5)/.5,e=tr<.5?2*tr*tr:1-Math.pow(-2*tr+2,2)/2;lvl=(k+e)/K;}else lvl=(ph==="d2e")?1:0;
      ctx.fillText("clamp front + single noise level",x2+w2/2,by+bh-7,w2-14);
      bars(x2,by+22,w2,bh-40,i=>i<d?1:lvl,d);
    }else{ctx.fillText("clamp front + ramp + tail",x2+w2/2,by+bh-7,w2-14);
      streamBars(x2,by+22,w2,bh-40,2,ph==="den"?f:(ph==="d2e"||ph==="loop")?1:0,dMod2);}   // staircase slides by d as the step emits d clean actions
    ctx.textAlign="left";
    // execute: d in-flight actions run through the compute (VLM + denoise), one tick at a time
    box([x3,by,w3,bh],"","",amber,true);
    ctx.textAlign="center";ctx.fillStyle=amber;ctx.font="700 12.5px Inter,sans-serif";ctx.fillText("Execute",x3+w3/2,by+15,w3-14);
    const PHc=rtc?PHR:PH2,Tc=PHc.reduce((s,p)=>s+p[1],0);
    let ef=(((tR%Tc)-denEnd)/Tc)%1;ef=(ef+1)%1;                                 // RTC: execute fills to full exactly at den-done, then resets for the next chunk
    const prog=rtc?ef*d:((t%Tc)/Tc)*d;   // Mod 2 unchanged
    const tx=x3+12,tw=w3-24,ty=by+36,th=15,sg=4,sw=(tw-(d-1)*sg)/d;
    for(let i=0;i<d;i++){const sx=tx+i*(sw+sg);rr(sx,ty,sw,th,3);ctx.fillStyle="#f7efe4";ctx.fill();
      const fr=Math.max(0,Math.min(1,prog-i));if(fr>0.02){rr(sx,ty,sw*fr,th,3);ctx.fillStyle=amber;ctx.fill();}}   // leading block grows continuously
    ctx.fillStyle=dim;ctx.font="600 9px Inter,sans-serif";ctx.fillText(`${d} in-flight actions`,x3+w3/2,ty+30,w3-16);
    ctx.fillStyle="#b06a1a";ctx.font="600 9px Inter,sans-serif";ctx.fillText("run during inference",x3+w3/2,ty+42,w3-16);ctx.textAlign="left";
    const lx1=x3+w3/2,lx2=x0+w0/2,yb=by+bh,yc=yb+40,ot=by+bh;
    arrowPath([[lx1,yb],[lx1,yc],[lx2,yc],[lx2,ot]],arw,ph==="loop"?Math.max(0,(f-0.35)/0.65):0,true);
    ctx.textAlign="left";
    
    
  }

  function draw(){ if(opts.jump&&mode!==4){cv.style.cursor="default";hov=null;} if(mode===0) drawStd(); else if(mode===2||mode===3) drawClamp(mode); else drawMod(mode); }

  const CAP={
    0:"<b>Synchronous Inference.</b> Predicts a chunk with a full VLM forward pass plus K denoising steps, then commits an 8-action sub-chunk open-loop while re-planning. It stalls during compute and every action runs on a stale observation, so its replanning interval is at least K·d + d_vlm control steps.",
    3:"<b>Train-Time RTC.</b> Clamps a clean front of d in-flight actions (inpaint) that keep executing during inference, so there is no stall. But it still runs a full VLM forward pass and all K denoising steps to predict the chunk, so the inference time stays K·d + d_vlm: it removes the stall but does not reduce latency or improve reactivity, and becomes infeasible once the clean front exceeds half the chunk length.",
    1:"<b>Modification 1, proprioception-reactive diffusion forcing.</b> The VLM runs asynchronously (cached feature, age d_vlm) while fresh proprioception feeds every denoising step, so the policy re-plans every control step. Shown at d = 0: it assumes each denoising step is instant (no delay), which is unrealistic; Modification 2 adds the latency-adaptive schedule for real delays.",
    2:"<b>Modification 2, latency-adaptive schedule.</b> A staircase (clean front + ramp + noise tail) emits d clean actions in a single denoising step and adapts to the delay d. The VLM here is still synchronous; removing that bottleneck is Modification 1's job.",
    4:"<b>πR².</b> The architecture change (a fresh-proprioception fast channel with asynchronous vision-language) and the inference change (the latency-adaptive staircase) combine into a single denoising step per call: it conditions on fresh proprioception and emits d clean actions, cutting the per-call inference time to one denoising step at any inference delay d.",
  };
  const cap=opts.cap?document.getElementById(opts.cap):null;
  function setCap(){if(cap)cap.innerHTML=CAP[mode]||"";}
  const seg=opts.seg?document.getElementById(opts.seg):null;
  if(seg)seg.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{mode=+b.dataset.m;t=0;seg.querySelectorAll("[data-m]").forEach(x=>x.classList.toggle("active",x===b));setCap();});
  if(opts.jump){cv.addEventListener("click",e=>{if(mode!==4||!hit)return;const r=cv.getBoundingClientRect(),lx=(e.clientX-r.left)*Wl/r.width,ly=(e.clientY-r.top)*Hl/r.height,inR=b=>b&&lx>=b[0]&&lx<=b[0]+b[2]&&ly>=b[1]&&ly<=b[1]+b[3],id=inR(hit.m2)?"mod2":(inR(hit.m1)||inR(hit.v1))?"mod1":null;if(id){const el=document.getElementById(id);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});}});
    cv.addEventListener("mousemove",e=>{if(mode!==4||!hit){hov=null;return;}const r=cv.getBoundingClientRect(),lx=(e.clientX-r.left)*Wl/r.width,ly=(e.clientY-r.top)*Hl/r.height,inR=b=>b&&lx>=b[0]&&lx<=b[0]+b[2]&&ly>=b[1]&&ly<=b[1]+b[3];hov=inR(hit.m2)?"m2":(inR(hit.m1)||inR(hit.v1))?"m1":null;cv.style.cursor=hov?"pointer":"default";});
    cv.addEventListener("mouseleave",()=>{hov=null;cv.style.cursor="default";});}
  window.__resetFlow=function(){t=0;ct=0;last=null;draw();cdraw();};   // headless capture: start each clip at the cycle beginning (obs->VLM)
  setCap();resize();cresize();addEventListener("resize",()=>{resize();cresize();});requestAnimationFrame(frame);
  if("IntersectionObserver" in window)new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible&&!running){running=true;last=null;requestAnimationFrame(frame);}},{threshold:0}).observe(cv);   // pause when the diagram is off-screen
}
mkFlow({canvas:"vla-canvas",seg:"flow-seg",cap:"flow-caption",jump:true});
mkFlow({canvas:"m1-canvas",fixedMode:1});

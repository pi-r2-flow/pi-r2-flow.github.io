/* piR2 — "why proprioception" widget. Per-task (box / book / spill) tabs.
   Left: live rollout video. Right canvas: real sparse vision camera frames
   (stale) above the dense per-tick fingertip-force trace. Drag anywhere on the
   canvas to scrub to any moment; release to resume. Internal/video synced. */
(function () {
  "use strict";
  const canvas = document.getElementById("proprio-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const video = document.getElementById("proprio-video");
  const tabsEl = document.getElementById("proprio-tabs");
  const ALL = window.PROPRIO_DATA || { tasks: [] };
  const cfg = { fast: "#2f6df0", slow: "#e0568f", dim: "#9aa3ae", grid: "#e9ecf1",
    good: "#0e9e8f", bad: "#d8466f", bg: "#f7f8fa", trackDim: "#cfd6df",
    thumb: "#e0843a", thumbDim: "rgba(224,132,58,0.30)" };

  let D, F = [0, 1, 0], TH = [], L = 3, FR = [], NF = 1, thumbs = [], REGIONS = [], spacing = 1, GA = null, TQ = null;
  let p = 0, last = null, playing = true, dragging = false;

  function loadTask(key) {
    D = ALL[key]; if (!D) return;
    F = D.force && D.force.length ? D.force : [0, 1, 0]; L = F.length;
    TH = D.thumb || [];
    FR = D.frames || []; NF = FR.length || 1;
    thumbs = FR.map(s => { const im = new Image(); im.src = s; return im; });
    REGIONS = D.regions || [];
    GA = D.gt_actions || null;
    TQ = D.torque || null;
    spacing = NF > 1 ? (L - 1) / (NF - 1) : L; p = 0;
    if (video) { video.src = D.clip; video.muted = true; video.preload = "auto"; video.load(); video.play().catch(() => {}); }
    if (tabsEl) tabsEl.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.k === key));
  }
  function force(t) { if (L < 2) return 0; const x = Math.max(0, Math.min(L - 1, t)), i0 = Math.floor(x), i1 = Math.min(L - 1, i0 + 1); return F[i0] + (F[i1] - F[i0]) * (x - i0); }
  function thumb(t) { if (TH.length < 2) return 0; const x = Math.max(0, Math.min(TH.length - 1, t)), i0 = Math.floor(x), i1 = Math.min(TH.length - 1, i0 + 1); return TH[i0] + (TH[i1] - TH[i0]) * (x - i0); }

  function resize() { const w = canvas.parentElement.clientWidth, h = 350, dpr = window.devicePixelRatio || 1; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  function frame(ts) {
    if (last == null) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    const dur = (video && video.duration && !isNaN(video.duration)) ? video.duration : null;
    if (!dragging) {
      if (video) {
        if (playing && video.paused) video.play().catch(() => {});   // keep autoplay alive; trace follows video
        if (dur) p = Math.min(L - 1, (video.currentTime / dur) * (L - 1));
      } else if (playing) { p += dt * 16; if (p >= L - 1) p = 0; }
    }
    draw(); requestAnimationFrame(frame);
  }

  function draw() {
    const W = canvas.clientWidth, H = canvas.clientHeight;
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, W, H);
    const padL = 14, padR = 14, plotW = W - padL - padR;
    const X = t => padL + plotW * (t / (L - 1));
    ctx.font = "600 11px ui-monospace,Menlo,monospace"; ctx.textBaseline = "middle";

    // vision lane: one cached-vision thumbnail per segment, placed at that segment
    const nSeg = REGIONS.length, thW = nSeg ? Math.min(56, (plotW - (nSeg - 1) * 8) / nSeg) : 0, thH = thW * 0.72, laneY = 20;
    let activeSeg = -1;
    for (let i = 0; i < nSeg; i++) if (p >= REGIONS[i][0]) activeSeg = i;
    // de-collide thumbnail + caption centers so wide captions never overlap
    ctx.font = "600 13px ui-monospace,monospace";
    const segHalf = REGIONS.map(r => Math.max(thW, ctx.measureText(r[2]).width + 12) / 2);
    const segX = REGIONS.map(r => X((r[0] + r[1]) / 2));
    for (let i = 0; i < nSeg; i++) {
      segX[i] = Math.max(segX[i], padL + segHalf[i]);
      if (i > 0) segX[i] = Math.max(segX[i], segX[i - 1] + segHalf[i - 1] + segHalf[i] + 4);
    }
    REGIONS.forEach((r, i) => {
      const x = segX[i] - thW / 2, on = i === activeSeg, im = thumbs[i];
      ctx.globalAlpha = on ? 1 : 0.42;
      if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, laneY, thW, thH);
      else { ctx.fillStyle = cfg.grid; ctx.fillRect(x, laneY, thW, thH); }
      ctx.globalAlpha = 1;
      if (on) { ctx.strokeStyle = cfg.slow; ctx.lineWidth = 2; ctx.strokeRect(x - 1, laneY - 1, thW + 2, thH + 2); }
    });

    const capY = laneY + thH + 13, plotTop = laneY + thH + 30, plotH = H - plotTop - 24, Y = v => plotTop + plotH * (1 - v);
    ctx.strokeStyle = cfg.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, Y(0)); ctx.lineTo(W - padR, Y(0)); ctx.stroke();
    // thumb curve (secondary)
    if (TH.length > 1) {
      ctx.strokeStyle = cfg.thumbDim; ctx.lineWidth = 2; ctx.beginPath();
      for (let t = 0; t < L; t++) { const x = X(t), y = Y(thumb(t)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      ctx.strokeStyle = cfg.thumb; ctx.lineWidth = 2; ctx.beginPath();
      for (let t = 0; t <= p; t++) { const x = X(t), y = Y(thumb(t)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    }
    // index curve (primary)
    ctx.strokeStyle = cfg.trackDim; ctx.lineWidth = 2; ctx.beginPath();
    for (let t = 0; t < L; t++) { const x = X(t), y = Y(force(t)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.strokeStyle = cfg.fast; ctx.lineWidth = 3; ctx.beginPath();
    for (let t = 0; t <= p; t++) { const x = X(t), y = Y(force(t)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();

    // torque traces (proprioception input, solid, coral)
    if (TQ) {
      Object.keys(TQ).forEach(k => {
        const arr = TQ[k]; ctx.strokeStyle = "#d64550"; ctx.lineWidth = 2; ctx.globalAlpha = 0.72;
        ctx.beginPath(); for (let t = 0; t < arr.length; t++) { const x = X(t), y = Y(arr[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1;
      });
    }
    // GT action traces (overlaid, normalized, dashed) — distinct hues per trace
    if (GA) {
      const handPal = ["#7c5cff", "#e0568f", "#9a6bff", "#5f7bff"]; let hi = 0;
      ctx.setLineDash([4, 3]);
      Object.keys(GA).forEach(k => {
        const arr = GA[k], isArm = k.indexOf("arm") === 0;
        ctx.strokeStyle = isArm ? "#159e8f" : handPal[hi++ % handPal.length]; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.6;
        ctx.beginPath(); for (let t = 0; t < arr.length; t++) { const x = X(t), y = Y(arr[t]); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); ctx.globalAlpha = 1;
      });
      ctx.setLineDash([]);
    }

    REGIONS.forEach((r, ri) => {
      const a = r[0], b = r[1], lab = r[2], xa = X(a), xb = X(b);
      const passed = p >= a, active = p >= a && p <= b, col = passed ? cfg.good : cfg.dim;
      // shaded band + boundary lines inside the plot
      ctx.fillStyle = active ? "rgba(14,158,143,0.12)" : "rgba(120,134,150,0.045)";
      ctx.fillRect(xa, plotTop, Math.max(1, xb - xa), plotH);
      ctx.strokeStyle = passed ? "rgba(14,158,143,0.55)" : "#dde2e9"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(xa, plotTop); ctx.lineTo(xa, plotTop + plotH); ctx.moveTo(xb, plotTop); ctx.lineTo(xb, plotTop + plotH); ctx.stroke(); ctx.setLineDash([]);
      // caption directly under this segment's thumbnail, at a consistent height
      ctx.font = (active ? "700 " : "600 ") + "13px ui-monospace,monospace";
      const tw = ctx.measureText(lab).width;
      const lx = segX[ri];   // de-collided center, matches thumbnail
      ctx.fillStyle = "rgba(247,248,250,0.96)"; ctx.beginPath(); ctx.roundRect(lx - tw / 2 - 6, capY - 9, tw + 12, 19, 5); ctx.fill();
      ctx.fillStyle = col; ctx.textAlign = "center"; ctx.fillText(lab, lx, capY);
    });

    const px = X(p);
    ctx.strokeStyle = cfg.fast; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px, plotTop - 4); ctx.lineTo(px, plotTop + plotH); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, Y(force(p)), 4, 0, 7); ctx.fillStyle = cfg.fast; ctx.fill();
    // legend: index vs thumb
    ctx.textAlign = "left"; ctx.font = "600 14px ui-monospace,monospace";
    let lx = padL;
    ctx.fillStyle = cfg.fast; ctx.beginPath(); ctx.arc(lx + 4, H - 9, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cfg.dim; ctx.fillText("index", lx + 12, H - 9); lx += 12 + ctx.measureText("index").width + 14;
    ctx.fillStyle = cfg.thumb; ctx.beginPath(); ctx.arc(lx + 4, H - 9, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cfg.dim; ctx.fillText("thumb force", lx + 12, H - 9); lx += 12 + ctx.measureText("thumb force").width + 16;
    if (TQ) {
      Object.keys(TQ).forEach(k => {
        ctx.strokeStyle = "#d64550"; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(lx, H - 9); ctx.lineTo(lx + 16, H - 9); ctx.stroke();
        ctx.fillStyle = cfg.dim; ctx.fillText(k, lx + 22, H - 9); lx += 22 + ctx.measureText(k).width + 14;
      });
    }
    if (GA) {
      const hp = ["#7c5cff", "#e0568f", "#9a6bff", "#5f7bff"]; let hli = 0;
      Object.keys(GA).forEach(k => {
        const isArm = k.indexOf("arm") === 0, col = isArm ? "#159e8f" : hp[hli++ % hp.length];
        const label = "GT " + k.replace("hand: ", "");
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(lx, H - 9); ctx.lineTo(lx + 16, H - 9); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = cfg.dim; ctx.fillText(label, lx + 22, H - 9); lx += 22 + ctx.measureText(label).width + 14;
      });
    }
  }

  // drag-to-scrub
  function xToP(cx) { const r = canvas.getBoundingClientRect(), padL = 14, padR = 14, plotW = r.width - padL - padR; return Math.max(0, Math.min(L - 1, (cx - r.left - padL) / plotW * (L - 1))); }
  function seek() { const dur = video && video.duration; if (dur) try { video.currentTime = (p / (L - 1)) * dur; } catch (e) {} }
  canvas.addEventListener("pointerdown", e => { dragging = true; if (video) video.pause(); p = xToP(e.clientX); seek(); try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener("pointermove", e => { if (dragging) { p = xToP(e.clientX); seek(); } });
  const end = () => { if (dragging) { dragging = false; if (video && playing) video.play().catch(() => {}); } };
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
  if (video) {
    video.addEventListener("click", () => { playing = !playing; playing ? video.play().catch(() => {}) : video.pause(); });
    video.addEventListener("canplay", () => { if (playing) video.play().catch(() => {}); });
  }

  if (tabsEl && ALL.tasks) ALL.tasks.forEach(k => { const b = document.createElement("button"); b.className = "tab"; b.dataset.k = k; b.textContent = (ALL[k] && ALL[k].label) || k; b.addEventListener("click", () => loadTask(k)); tabsEl.appendChild(b); });
  loadTask((ALL.tasks && ALL.tasks[0]) || "box");
  window.addEventListener("resize", resize); resize(); requestAnimationFrame(frame);
})();

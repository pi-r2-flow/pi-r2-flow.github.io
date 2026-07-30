/* piR2 hero: cycles through the tasks one at a time. Each task's proprioception
   (fingertip force, solid teal) and the action it drives (dashed purple) are shown
   split across the two canvases flanking the piR2 title; a dot sweeps and ripples
   when the action reacts, then it advances to the next task. Edit TASKS to change
   which tasks/windows/action-dims are shown. */
(function () {
  "use strict";
  const canvases = [...document.querySelectorAll(".hero-wave")];
  if (!canvases.length) return;
  const C_IDX = "#0e9e8f", C_ACT = "#7c5cff", DIM = "#cfd6df", ACT_DIM = "rgba(124,92,255,.26)";
  const PADX = 10, BAND = 16, SECS = 6;   // seconds per task sweep

  const TASKS = [
    { task: "catch", name: "Catch Book",   trim: [0.10, 0.88], act: "hand: thumb bend" },
    { task: "box",   name: "Insert Box",   trim: [0.30, 0.82], act: "hand: index j1" },
    { task: "book",  name: "Tidy Up Book", trim: [0.45, 1.00], act: "hand: index j1" },
    { task: "spill", name: "Don't Spill",  trim: [0.34, 0.86], act: "hand: index j1" },
  ];

  let ti = 0, F = null, GA = null, NAME = "", L = 0, SP = 0, loaded = -1;
  function load() {
    const d = window.PROPRIO_DATA; if (!d) return false;
    if (loaded === ti && F) return true;
    const s = TASKS[ti], t = d[s.task];
    if (!t || !t.force || !t.force.length) { ti = (ti + 1) % TASKS.length; return false; }
    const nz = a => { const m = Math.max.apply(null, a) || 1; return a.map(v => v / m); };
    const slice = (a, f) => a.slice(Math.floor(f[0] * (a.length - 1)), Math.ceil(f[1] * (a.length - 1)) + 1);
    const ga = t.gt_actions && (t.gt_actions[s.act] || t.gt_actions["hand: index j1"]);
    F = nz(slice(t.force, s.trim)); GA = ga ? nz(slice(ga, s.trim)) : null; NAME = s.name; L = F.length;
    SP = (L - 1) / 2;
    loaded = ti; return true;
  }
  const at = (arr, i) => { const x = Math.max(0, Math.min(L - 1, i)), a = Math.floor(x), b = Math.min(L - 1, a + 1); return 0.1 + 0.8 * (arr[a] + (arr[b] - arr[a]) * (x - a)); };

  const waves = canvases.map((c, k) => ({ c, ctx: c.getContext("2d"), k }));
  let p = 0, last = null, visible = true, running = true;
  function resize() { const dpr = window.devicePixelRatio || 1; for (const o of waves) { const w = o.c.clientWidth || 190, h = 60; o.c.width = w * dpr; o.c.height = h * dpr; o.c.style.height = h + "px"; o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); } }
  function geo(H) { const top = BAND, bot = H - 6; return { mid: (top + bot) / 2, amp: bot - top }; }

  function drawWave(o, ts) {
    const ctx = o.ctx, W = o.c.clientWidth, H = o.c.clientHeight, { mid, amp } = geo(H);
    const single = waves.length === 1;                                 // record page uses one canvas -> show the full trace
    const i0 = single ? 0 : (o.k === 0 ? 0 : SP), i1 = single ? (L - 1) : (o.k === 0 ? SP : (L - 1));   // else split across the two canvases
    const x = i => PADX + (W - 2 * PADX) * ((i - i0) / (i1 - i0));
    const y = (arr, i) => mid - (at(arr, i) - 0.5) * amp;
    ctx.clearRect(0, 0, W, H);

    function trace(arr, color, dim, lw, dash) {
      ctx.setLineDash(dash || []);
      ctx.strokeStyle = dim; ctx.lineWidth = lw; ctx.beginPath();
      for (let i = Math.floor(i0); i <= Math.ceil(i1); i++) { const px = x(i), py = y(arr, i); i === Math.floor(i0) ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.stroke();
      const upto = Math.min(p, i1);
      if (upto >= i0) { ctx.strokeStyle = color; ctx.lineWidth = lw + 0.6; ctx.beginPath(); for (let i = Math.floor(i0); i <= upto; i++) { const px = x(i), py = y(arr, i); i === Math.floor(i0) ? ctx.moveTo(px, py) : ctx.lineTo(px, py); } ctx.lineTo(x(upto), y(arr, upto)); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    if (GA) trace(GA, C_ACT, ACT_DIM, 1.6, [4, 3]);   // action (dashed) reacts to the force
    trace(F, C_IDX, DIM, 2.2);                          // fingertip force (solid)

    ctx.font = "600 8.5px ui-monospace,Menlo,monospace"; ctx.textBaseline = "alphabetic";
    if (o.k === 0) {                       // legend on the left canvas
      ctx.textAlign = "left";
      ctx.fillStyle = C_IDX; ctx.fillRect(PADX, 4, 6, 5);
      ctx.fillStyle = "#9aa3ae"; ctx.fillText("proprioception", PADX + 9, 10);
      const x2 = PADX + 9 + ctx.measureText("proprioception").width + 9;
      ctx.strokeStyle = C_ACT; ctx.lineWidth = 1.6; ctx.setLineDash([3, 2]); ctx.beginPath(); ctx.moveTo(x2, 6.5); ctx.lineTo(x2 + 9, 6.5); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#9aa3ae"; ctx.fillText("action", x2 + 13, 10);
    }

    if (p >= i0 && p <= i1) {              // the dot lives on this canvas right now
      const dx = x(p), dy = y(F, p);
      const rise = (arr, q) => Math.max(0, Math.min(1, (at(arr, q) - at(arr, q - 4)) * 5));   // keep the highlight lit from the force spike through the lagging action
      let react = 0; for (let k = 0; k <= 30; k++) { react = Math.max(react, rise(F, p - k)); if (GA) react = Math.max(react, rise(GA, p - k)); }
      if (react > 0.1) {
        for (let j = 0; j < 2; j++) {
          const ph = ((ts / 620) + j * 0.5) % 1;
          ctx.beginPath(); ctx.arc(dx, dy, 4 + ph * 17, 0, 7);
          ctx.strokeStyle = `rgba(124,92,255,${react * (1 - ph) * 0.8})`; ctx.lineWidth = 2; ctx.stroke();
        }
      }
      const pulse = 0.5 + 0.5 * Math.sin(ts / 1000 * 4);
      ctx.beginPath(); ctx.arc(dx, dy, 4.5 + 3 * pulse + react * 6, 0, 7); ctx.fillStyle = `rgba(14,158,143,${0.13 + react * 0.26})`; ctx.fill();
      ctx.beginPath(); ctx.arc(dx, dy, 3.4, 0, 7); ctx.fillStyle = C_IDX; ctx.fill();
    }
  }

  function frame(ts) {
    if (last == null) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (load()) {
      p += dt * (L / SECS);
      if (p >= L - 1) { p = 0; ti = (ti + 1) % TASKS.length; load(); }   // advance to the next task after each sweep
      for (const o of waves) drawWave(o, ts);
    }
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  window.__resetFlow = function () { p = 0; ti = 0; loaded = -1; last = null; };   // headless capture: start at the first task
  window.addEventListener("resize", resize); resize(); requestAnimationFrame(frame);
  if (canvases[0] && "IntersectionObserver" in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !running) { running = true; last = null; requestAnimationFrame(frame); } }, { threshold: 0 }).observe(canvases[0]);   // pause the loop when the hero is scrolled off-screen
})();

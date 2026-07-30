/* piR2 — schedule speed comparison: πR² vs one selectable baseline.
   Time unit = ONE denoising step (one NFE). On a shared clock:
     πR² (ours)      : 1 denoising step / call  -> emit d clean actions, slide by d.
     Standard Flow   : K denoising steps / call -> emit H open-loop  (K× slower).
     Train-Time RTC  : K denoising steps / call -> emit d            (K× slower).
   Live time + call counters make the K× gap explicit. Pure canvas + vanilla JS. */
(function () {
  "use strict";
  const H = 16, D_MAX = 3, K = 4;
  const cfg = {
    bg: "#f7f8fa", grid: "#eef1f5", text: "#2b3038", dim: "#9aa3ae",
    clean: "#0e9e8f", emit: "#0a7d70", flow: "#7a8696", rtc: "#e0568f", ours: "#0e9e8f", slow: "#e0568f",
  };
  function sched(i, d) { if (i < d) return 1; if (i < H - d) { const m = H - 2 * d; return 1 - (i - d + 1) / (m + 1); } return 0; }
  function tauColor(t) { const c0 = [0xee, 0xf1, 0xf5], c1 = [0x0e, 0x9e, 0x8f], e = Math.pow(Math.max(0, t), 0.85); return `rgb(${Math.round(c0[0] + (c1[0] - c0[0]) * e)},${Math.round(c0[1] + (c1[1] - c0[1]) * e)},${Math.round(c0[2] + (c1[2] - c0[2]) * e)})`; }
  const lerp = (a, b, t) => a + (b - a) * t;

  const canvas = document.getElementById("schedule-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const elD = document.getElementById("delay-slider");
  const elDval = document.getElementById("delay-val");
  const elPlay = document.getElementById("play-toggle");
  const elSpeed = document.getElementById("speed-slider");
  const seg = document.getElementById("baseline-seg");
  const compareBtn = document.getElementById("compare-btn");

  let baseline = "rtc", comparing = false, d = 2, playing = true, last = null, a = 1, dwellT = 0, stepping = false, steps = 0;
  let items = [];
  let bK = 0, bLvl = 0, bFrom = 0, bFlash = 0, bEmit = 0, bCalls = 0, oursEmit = 0, oursCalls = 0;

  function rebuildOurs() { items = []; for (let i = 0; i < H; i++) items.push({ slot: i, tau: sched(i, d), x0: i, t0: sched(i, d), emit: false }); }
  function reset() { bK = 0; bLvl = 0; bFrom = 0; bFlash = 0; bEmit = 0; bCalls = 0; oursEmit = 0; oursCalls = 0; steps = 0; rebuildOurs(); }
  function setD(nd) { d = Math.min(D_MAX, Math.max(1, nd | 0)); if (elDval) elDval.textContent = d; reset(); }
  function setBaseline(b) { baseline = b; if (seg) seg.querySelectorAll(".segbtn").forEach(x => x.classList.toggle("active", x.dataset.b === b)); reset(); }

  function startStep() {              // one denoising step = one time unit
    stepping = true; a = 0; steps++;
    for (const it of items) { it.x0 = it.slot; it.t0 = it.tau; it.slot -= d; if (it.slot < 0) it.emit = true; else it.tau = sched(it.slot, d); }
    for (let j = 0; j < d; j++) { const s = H - d + j; items.push({ slot: s, x0: s + d, t0: 0, tau: sched(s, d), emit: false }); }
    bFrom = bLvl; bK++; bLvl = Math.min(1, bK / K);
  }
  function endStep() {
    stepping = false;
    items = items.filter(it => !it.emit); oursEmit += d; oursCalls++;     // ours: a call every step
    if (bK >= K) { bEmit += Math.min(H, K * d); bFlash = 1; bK = 0; bLvl = 0; bCalls++; }
  }

  function resize() { const w = canvas.parentElement.clientWidth, h = 360, dpr = window.devicePixelRatio || 1; canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw(); }
  function frame(ts) {
    if (last == null) last = ts; const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (playing) {
      const spd = elSpeed ? (0.4 + (elSpeed.value / 100) * 1.8) : 1, moveDur = 0.5, dwellDur = 0.34;
      bFlash = Math.max(0, bFlash - dt * 2.5);
      if (stepping) { a += dt / (moveDur / spd); if (a >= 1) { a = 1; endStep(); dwellT = 0; } }
      else { dwellT += dt; if (dwellT >= dwellDur / spd) startStep(); }
    }
    draw(); requestAnimationFrame(frame);
  }
  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function draw() {
    const W = canvas.clientWidth, Ht = canvas.clientHeight;
    ctx.clearRect(0, 0, W, Ht); ctx.fillStyle = cfg.bg; ctx.fillRect(0, 0, W, Ht);
    const padX = 16, cellGap = 4, step0 = (W - padX * 2 + cellGap) / H, cw = step0 - cellGap;
    const topNote = 30, rowGap = 18;
    ctx.font = "600 11px ui-monospace,Menlo,monospace"; ctx.textBaseline = "middle";

    ctx.textAlign = "left"; ctx.fillStyle = cfg.dim;
    if (comparing) {
      ctx.fillText(`πR²: 1 NFE/call  ·  baseline: ${K} NFE/call  →  ${K}× more latency`, padX, 13);
      ctx.textAlign = "right"; ctx.fillStyle = cfg.ours;
      ctx.fillText(`πR² ${oursCalls} calls vs ${bCalls}  →  ${K}× faster`, W - padX, 13);
      const rowH = (Ht - topNote - rowGap) / 2;
      drawRow(topNote, rowH, baseline);
      drawRow(topNote + rowH + rowGap, rowH, "ours");
    } else {
      ctx.fillText(`πR² emits ${d} clean actions every step (1 NFE / call)`, padX, 13);
      ctx.textAlign = "right"; ctx.fillStyle = cfg.ours;
      ctx.fillText(`${oursCalls} calls`, W - padX, 13);
      drawRow(topNote + 30, Ht - topNote - 60, "ours");
    }

    function drawRow(y0, h, m) {
      const labH = 22, barMax = h - labH - 6, by = y0 + labH;
      const name = m === "flow" ? "Standard Flow" : m === "rtc" ? "Train-Time RTC" : "πR² (ours)";
      const col = m === "flow" ? cfg.flow : m === "rtc" ? cfg.rtc : cfg.ours;
      const bd = Math.min(H, K * d);
      // RTC clamps a clean front of K*d; needs room for ramp+tail -> 2*K*d <= H. Infeasible otherwise.
      const infeasible = m === "rtc" && 2 * K * d > H;
      ctx.textAlign = "left"; ctx.fillStyle = col; ctx.font = "700 12px ui-monospace,monospace";
      ctx.fillText(name, padX, y0 + 10);
      ctx.fillStyle = cfg.dim; ctx.font = "600 11px ui-monospace,monospace";
      const detail = m === "ours" ? `1 NFE/call · in-flight ${d}` : `${K} NFE/call · in-flight ${bd} (${K}× slower)`;
      ctx.fillText("· " + detail, padX + ctx.measureText(name).width + 8, y0 + 10);
      if (!infeasible) { ctx.textAlign = "right"; ctx.fillStyle = col; ctx.fillText(`calls ${m === "ours" ? oursCalls : bCalls} · emitted ${m === "ours" ? oursEmit : bEmit}`, W - padX, y0 + 10); }

      for (let p = 0; p < H; p++) { ctx.fillStyle = cfg.grid; rr(padX + p * step0, by, cw, barMax, 3); ctx.fill(); }

      if (infeasible) {
        ctx.fillStyle = cfg.bad || "#c2452f"; ctx.textAlign = "center"; ctx.font = "700 13px ui-monospace,monospace";
        ctx.fillText(`infeasible:  effective delay ${K}×${d} = ${K * d}  exceeds  half the chunk length (${H}/2 = ${H / 2})`, padX + (W - 2 * padX) / 2, by + barMax / 2);
        return;
      }

      if (m === "ours") {
        for (const it of items) {
          const pos = lerp(it.x0, it.slot, a); if (pos < -0.95 || pos > H - 0.05) continue;
          const t = lerp(it.t0, it.tau, a), x = padX + pos * step0, bh = Math.max(4, t * barMax);
          ctx.fillStyle = it.emit ? cfg.emit : tauColor(t); rr(x, by + (barMax - bh), cw, bh, 3); ctx.fill();
        }
      } else {
        const lvl = lerp(bFrom, bLvl, a);
        for (let p = 0; p < H; p++) {
          const t = (m === "rtc" && p < bd) ? 1 : lvl, x = padX + p * step0, bh = Math.max(4, t * barMax);
          const isEmit = bFlash > 0.3 && p < bd;
          ctx.fillStyle = isEmit ? cfg.emit : tauColor(t); rr(x, by + (barMax - bh), cw, bh, 3); ctx.fill();
        }
        // denoising-step pips for the baseline (shows it needs K)
        ctx.textAlign = "left"; ctx.fillStyle = cfg.dim; ctx.font = "600 10px ui-monospace,monospace";
        ctx.fillText(`step ${Math.min(K, bK)}/${K}`, padX, by + barMax + 12);
      }
    }
  }

  if (elD) { elD.min = 1; elD.max = D_MAX; elD.step = 1; elD.value = d; elD.addEventListener("input", () => setD(+elD.value)); }
  if (elPlay) elPlay.addEventListener("click", () => { playing = !playing; elPlay.textContent = playing ? "❚❚ Pause" : "▶ Play"; elPlay.classList.toggle("paused", !playing); });
  if (seg) seg.querySelectorAll(".segbtn").forEach(b => b.addEventListener("click", () => setBaseline(b.dataset.b)));
  if (compareBtn) compareBtn.addEventListener("click", () => {
    comparing = !comparing;
    compareBtn.textContent = comparing ? "− Hide baseline" : "+ Compare against baselines";
    compareBtn.classList.toggle("paused", comparing);
    if (seg) seg.style.display = comparing ? "" : "none";
    reset();
  });
  setD(d); setBaseline("rtc");
  window.addEventListener("resize", resize); resize(); requestAnimationFrame(frame);
})();

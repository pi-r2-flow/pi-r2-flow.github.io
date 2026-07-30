/* piR2 — sim delay explorer, multi-task.
   Slider over unit delay d0 -> live success-rate plot per task. Tabs switch tasks.
   Leap Cube Reorient uses the real paper_corl FAIR numbers (multi_success_rate);
   the extra tasks are PLACEHOLDERS -- drop in real eval numbers when ready. */
(function () {
  "use strict";
  const XS = ["1", "2", "3"];
  // Each entry supports optional s (std) for error bars: mk({m: [...], s: [...]}, ...)
  const mk = (naive, rtc, ona, ours) => {
    const norm = a => Array.isArray(a) ? {m: a, s: [0, 0, 0]} : a;
    const [N, R, O, U] = [naive, rtc, ona, ours].map(norm);
    return [
      { key: "naive",   label: "Flow, naive async",    color: "#7f8b9c",              y: {1: N.m[0], 2: N.m[1], 3: N.m[2]}, s: {1: N.s[0], 2: N.s[1], 3: N.s[2]} },
      { key: "rtc",     label: "Flow, Train-Time RTC", color: "#e0568f",              y: {1: R.m[0], 2: R.m[1], 3: R.m[2]}, s: {1: R.s[0], 2: R.s[1], 3: R.s[2]} },
      { key: "ours_na", label: "πR² (w/o async)",      color: "#5bb3a6",              y: {1: O.m[0], 2: O.m[1], 3: O.m[2]}, s: {1: O.s[0], 2: O.s[1], 3: O.s[2]} },
      { key: "ours",    label: "πR² (full)",           color: "#0e9e8f", ours: true,  y: {1: U.m[0], 2: U.m[1], 3: U.m[2]}, s: {1: U.s[0], 2: U.s[1], 3: U.s[2]} },
    ];
  };
  const TASKS = [
    // Leap: mean over 3 training seeds (error bars = std). Bar heights are the means; keep numbers rounded.
    { key: "leap", label: "Leap Cube Reorientation", yMax: 0.5, placeholder: false,
      note: "πR² wins by cutting the effective delay (fewer denoising steps + asynchronous vision state (cube pose)). Mean ± std over 3 training seeds.",
      series: mk(
        {m: [0.33, 0.29, 0.22], s: [0.04, 0.08, 0.04]},   // Flow, naive async
        {m: [0.36, 0.32, 0.19], s: [0.04, 0.08, 0.03]},   // Flow, Train-Time RTC
        {m: [0.42, 0.38, 0.35], s: [0.05, 0.02, 0.05]},   // πR² (w/o async)
        {m: [0.43, 0.42, 0.45], s: [0.01, 0.02, 0.01]},   // πR² (full)
      ) },
  ];

  const canvas = document.getElementById("delay-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const slider = document.getElementById("delay-x");
  const dlabel = document.getElementById("delay-x-val");
  const tabsEl = document.getElementById("delay-tabs");
  const noteEl = document.getElementById("delay-note");

  let ti = 0, idx = 1;
  const task = () => TASKS[ti];

  function setTask(i) {
    ti = i;
    if (tabsEl) tabsEl.querySelectorAll(".tab").forEach((b, k) => b.classList.toggle("active", k === i));
    if (noteEl) noteEl.innerHTML = (task().placeholder ? "<b style='color:#c2452f'>[placeholder]</b> " : "") + task().note;
    draw();
  }

  function resize() {
    const w = canvas.parentElement.clientWidth, h = 300, dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr; canvas.style.width = w + "px"; canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }

  function rr(x, y, w, h, r) { r = Math.min(r, w / 2, Math.abs(h) / 2); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
  function draw() {
    const W = canvas.clientWidth, H = canvas.clientHeight, T = task(), yMax = T.yMax;
    ctx.clearRect(0, 0, W, H);
    const padL = 52, padR = 14, padT = 16, padB = 40, plotW = W - padL - padR, plotH = H - padT - padB;
    const Y = v => padT + plotH * (1 - v / yMax);
    const S = T.series, nG = XS.length, nB = S.length;
    const groupW = plotW / nG, barW = groupW * 0.16, gap = groupW * 0.028, totalW = nB * barW + (nB - 1) * gap;
    const rot = (barW + gap) < 26;   // narrow (mobile): rotate value labels vertical so they don't overlap

    // gridlines + y labels
    ctx.strokeStyle = "#e9ecf1"; ctx.fillStyle = "#222831"; ctx.font = "11px ui-monospace,monospace";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let t = 0; t <= 2; t++) { const g = yMax * t / 2, y = Y(g); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.fillText(g.toFixed(2), padL - 8, y); }

    XS.forEach((lab, gi) => {
      const gx = padL + groupW * gi, start = gx + (groupW - totalW) / 2, sel = gi === idx;
      if (sel) { ctx.fillStyle = "rgba(14,158,143,0.07)"; ctx.fillRect(gx + 3, padT, groupW - 6, plotH); }   // highlight the selected d0
      S.forEach((s, mi) => {
        const v = s.y[lab], bx = start + mi * (barW + gap), by = Y(v), bh = padT + plotH - by;
        ctx.globalAlpha = sel ? 1 : 0.42;
        ctx.fillStyle = s.color; rr(bx, by, barW, Math.max(1.5, bh), 3); ctx.fill();
        // error bar (whisker) if std > 0
        const sd = (s.s && s.s[lab]) || 0;
        if (sd > 0) {
          const yHi = Y(Math.min(v + sd, yMax)), yLo = Y(Math.max(v - sd, 0)), cx = bx + barW / 2, cap = Math.max(3, barW * 0.30);
          ctx.strokeStyle = "#2b2f36"; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cx, yHi); ctx.lineTo(cx, yLo); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - cap, yHi); ctx.lineTo(cx + cap, yHi); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(cx - cap, yLo); ctx.lineTo(cx + cap, yLo); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        if (sel) {   // value labels on the highlighted group (vertical on mobile to avoid overlap)
          const vlab = v.toFixed(2), cx = bx + barW / 2;
          // Position label above whisker top (or bar top if no std) to avoid overlap.
          const labelY = sd > 0 ? Y(Math.min(v + sd, yMax)) - 3 : by - 2;
          ctx.fillStyle = s.ours ? "#0a7d72" : "#69727f"; ctx.font = (s.ours ? "700 " : "600 ") + (rot ? 9 : 9.5) + "px ui-monospace,monospace";
          if (rot) {
            const lw = ctx.measureText(vlab).width, sy = Math.max(lw + 2, labelY);
            ctx.save(); ctx.translate(cx, sy); ctx.rotate(-Math.PI / 2);
            ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(vlab, 0, 0); ctx.restore();
          } else {
            ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(vlab, cx, labelY);
          }
        }
      });
      ctx.fillStyle = "#222831"; ctx.font = (sel ? "700 " : "") + "11px ui-monospace,monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillText("d₀=" + lab, gx + groupW / 2, H - padB + 8);
    });
    ctx.save(); ctx.translate(12, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "#222831"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "11px ui-monospace,monospace"; ctx.fillText("success rate", 0, 0); ctx.restore();
  }

  if (tabsEl) TASKS.forEach((t, i) => { const b = document.createElement("button"); b.className = "tab" + (i === 0 ? " active" : ""); b.textContent = t.label; b.addEventListener("click", () => setTask(i)); tabsEl.appendChild(b); });
  if (slider) { slider.min = 0; slider.max = XS.length - 1; slider.step = 1; slider.value = idx; slider.addEventListener("input", () => { idx = +slider.value; if (dlabel) dlabel.textContent = XS[idx]; draw(); }); }
  setTask(0);
  window.addEventListener("resize", resize); resize();
})();

/* tabs + lazy video */
(function () {
  "use strict";
  // task tabs
  document.querySelectorAll("[data-tabgroup]").forEach(group => {
    const g = group.getAttribute("data-tabgroup");
    const tabs = document.querySelectorAll(`.tab[data-tab="${g}"]`);
    const panels = document.querySelectorAll(`[data-panel="${g}"]`);
    tabs.forEach(t => t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      panels.forEach(p => p.style.display = "none");
      t.classList.add("active");
      const tgt = document.querySelector(`[data-panel="${g}"][data-key="${t.dataset.key}"]`);
      if (tgt) tgt.style.display = "";
      panels.forEach(p => p.querySelectorAll("video").forEach(v => { v.pause(); v.loop = true; }));   // stop old panel, restore loop
      if (tgt) tgt.querySelectorAll("video").forEach(v => v.play().catch(() => {}));                  // autoplay the newly-shown panel's clips
      const pab = document.querySelector(`.playall[data-group="${g}"]`);                              // reset play-all label for the new task
      if (pab) pab.textContent = "▶ Play all";
    }));
  });
  // pause offscreen videos
  const io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target; if (!e.isIntersecting && !v.paused) v.pause();
  }), { threshold: 0.1 });
  document.querySelectorAll("video").forEach(v => io.observe(v));

  // play-all: sync-play every video in the active panel of a tab group
  document.querySelectorAll(".playall").forEach(btn => {
    btn.addEventListener("click", () => {
      const g = btn.dataset.group;
      let panel = null;
      document.querySelectorAll(`[data-panel="${g}"]`).forEach(p => { if (p.style.display !== "none") panel = p; });
      if (!panel) return;
      const vids = panel.querySelectorAll("video");
      const playing = [...vids].some(v => !v.paused && !v.ended);
      vids.forEach(v => { if (playing) { v.pause(); v.loop = true; } else { v.loop = false; try { v.currentTime = 0; } catch (e) {} v.play().catch(() => {}); } });
      btn.textContent = playing ? "▶ Play all" : "❚❚ Pause all";
    });
  });

  // teleop comparison: hide native fullscreen too (side-by-side, single-video FS breaks it)
  document.querySelectorAll('[data-panel="tele"] video').forEach(v => { v.setAttribute("controlsList", "nofullscreen"); try { v.disablePictureInPicture = true; } catch (e) {} });

  // ✓/✗ outcome is burned into the video pixels (over the last ~18%), so it stays
  // visible in native fullscreen. No DOM overlay; just disable PiP so there's a
  // single native fullscreen control that doesn't block the scrubber.
  document.querySelectorAll(".vcell[data-task][data-method] video, .gv[data-task][data-method] video")
    .forEach(v => { try { v.disablePictureInPicture = true; } catch (e) {} });
})();

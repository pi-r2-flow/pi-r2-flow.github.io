/* Drag anywhere on a .scrub video to scrub it; release to resume playing.
   Restores the old "scrub on the video" interaction for the fast-channel clips. */
(function () {
  "use strict";
  document.querySelectorAll("video.scrub").forEach(v => {
    let dragging = false;
    const toTime = e => {
      const r = v.getBoundingClientRect();
      const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      if (v.duration && !isNaN(v.duration)) v.currentTime = f * v.duration;
    };
    v.addEventListener("pointerdown", e => {
      dragging = true; v.pause(); toTime(e);
      try { v.setPointerCapture(e.pointerId); } catch (_) {}
    });
    v.addEventListener("pointermove", e => { if (dragging) toTime(e); });
    const end = () => { if (dragging) { dragging = false; v.play().catch(() => {}); } };
    v.addEventListener("pointerup", end);
    v.addEventListener("pointercancel", end);
  });
})();

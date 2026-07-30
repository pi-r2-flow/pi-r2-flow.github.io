/* piR2 teaser reel: a short narrative in one frame.
   Phase 1 -- standard VLAs fail (slow, open-loop, not reactive; red X burned in).
   Phase 2 -- piR2 reacts and succeeds (green check). Loops back to the top. */
(function () {
  "use strict";
  const v = document.getElementById("teaser-reel");
  if (!v) return;
  const lab = document.getElementById("reel-lab"), phase = document.getElementById("reel-phase");
  const V = "static/videos/teaser/";
  const FAIL_HEAD = "Vision-Language-Action policies are slow and not reactive — they fail on contact.";
  const OURS_HEAD = "πR² makes them reactive and real-time.";
  const REEL = [
    { src: "fail_box.mp4",   tag: "Standard VLA", fail: true,  head: FAIL_HEAD },
    { src: "fail_spill.mp4", tag: "Standard VLA", fail: true,  head: FAIL_HEAD },
    { src: "fail_catch.mp4", tag: "Standard VLA", fail: true,  head: FAIL_HEAD },
    { src: "ours_box.mp4",   tag: "πR² (ours)", fail: false, head: OURS_HEAD },
    { src: "ours_spill.mp4", tag: "πR² (ours)", fail: false, head: OURS_HEAD },
    { src: "ours_catch.mp4", tag: "πR² (ours)", fail: false, head: OURS_HEAD },
  ];
  let i = 0;
  function load() {
    const it = REEL[i];
    v.src = V + it.src;
    lab.textContent = it.tag;
    lab.style.background = it.fail ? "rgba(194,69,47,.92)" : "rgba(14,158,143,.92)";
    if (phase) { phase.textContent = it.head; phase.style.color = it.fail ? "#c2452f" : "var(--accent-d)"; }
    v.play().catch(() => {});
  }
  v.addEventListener("ended", () => { i = (i + 1) % REEL.length; load(); });
  v.addEventListener("canplay", () => v.play().catch(() => {}));
  load();
})();

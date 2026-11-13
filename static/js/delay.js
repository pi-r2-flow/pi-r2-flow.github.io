/* Highlight one panel of the single paper-exported Sim ABC figure. */
(function () {
  "use strict";
  const tabs = document.getElementById("delay-tabs"), highlight = document.getElementById("abc-highlight"), note = document.getElementById("delay-note");
  if (!tabs || !highlight) return;
  const views = [
    {label: "(a) h sweep", cls: "panel-a", note: "Panel (a): success rate versus execution horizon h without inference delay."},
    {label: "(b) Prior methods", cls: "panel-b", note: "Panel (b): simulation comparison against Standard Flow, Train-time RTC, FASTER, and SDP under increasing unit delay d₀."},
    {label: "(c) Ablations", cls: "panel-c", note: "Panel (c): component ablations for the async slow channel, staircase schedule, and latency adaptation."}
  ];
  views.forEach((view, i) => {
    const button = document.createElement("button"); button.className = "tab" + (i === 1 ? " active" : ""); button.textContent = view.label;
    button.addEventListener("click", () => { highlight.className = "abc-highlight " + view.cls; note.textContent = view.note; tabs.querySelectorAll(".tab").forEach((b, j) => b.classList.toggle("active", i === j)); }); tabs.appendChild(button);
  });
  note.textContent = views[1].note;
})();

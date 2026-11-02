(() => {
  "use strict";
  const OPEN = "[data-radio-open]";
  let layer = null, frame = null;

  function ensure() {
    if (layer) return;
    const style = document.createElement("style");
    style.textContent = `
      #radioLayer{position:fixed;inset:0;z-index:120000;background:#f3f1eb;opacity:0;pointer-events:none;transition:opacity .28s ease}
      #radioLayer.on{opacity:1;pointer-events:auto}
      #radioLayer iframe{width:100%;height:100%;border:0;display:block;background:#f3f1eb}
      body.radio-open{overflow:hidden}
    `;
    document.head.appendChild(style);
    layer = document.createElement("div");
    layer.id = "radioLayer";
    layer.innerHTML = '<iframe title="白噪音收音机" loading="eager"></iframe>';
    document.body.appendChild(layer);
    frame = layer.querySelector("iframe");
  }
  function open() {
    ensure();
    if (!frame.src) frame.src = "radio.html?embed=1";
    requestAnimationFrame(() => layer.classList.add("on"));
    document.body.classList.add("radio-open");
  }
  function close() {
    if (!layer) return;
    layer.classList.remove("on");
    document.body.classList.remove("radio-open");
  }
  addEventListener("click", e => {
    const b = e.target.closest && e.target.closest(OPEN);
    if (!b) return;
    e.preventDefault();
    open();
  });
  addEventListener("message", e => {
    if (e.data && e.data.type === "paper-desk:radio-close") close();
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && layer && layer.classList.contains("on")) {
      e.preventDefault(); close();
    }
  });
  window.RadioRoom = { open, close };
})();
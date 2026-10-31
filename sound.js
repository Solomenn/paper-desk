/* Sounds for the desk: real foley from sasshi (sounds/manifest.json), one take at random per play, its own
   gain trim, start (lead) and length. The room's ambience (leaves, birds now and then) is off until asked for.
   M toggles the sounds, Shift+M the ambience. Shared by every page. (After sasshi src/sound, AGPL-3.0.) */
(() => {
  "use strict";
  const SKEY = "paper-desk.sound.v1", AKEY = "paper-desk.ambient.v1";
  const get = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch { return fb; } };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  let on = !!get(SKEY, true), amb = !!get(AKEY, false);
  let ac = null, master = null, man = null, ambMan = null;
  const buffers = new Map(), loading = new Map();
  const base = "sounds/";
  function ctx() {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ac = new C(); master = ac.createGain(); master.gain.value = on ? 1 : 0; master.connect(ac.destination);
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }
  const manifest = fetch(base + "manifest.json").then(r => r.json()).then(m => (man = m)).catch(() => null);
  const ambient = fetch(base + "ambient.json").then(r => r.json()).then(m => (ambMan = m)).catch(() => null);
  function buffer(file) {
    if (buffers.has(file)) return Promise.resolve(buffers.get(file));
    if (loading.has(file)) return loading.get(file);
    const p = fetch(base + file).then(r => r.arrayBuffer()).then(a => new Promise((res, rej) => ctx().decodeAudioData(a, res, rej)))
      .then(b => { buffers.set(file, b); return b; }).catch(() => null);
    loading.set(file, p); return p;
  }
  // takes for a kind: "drop", "pageTurn" … or "impact.paper.soft"
  function takes(kind) {
    if (!man) return null;
    if (kind.startsWith("impact.")) { const [, mat, f] = kind.split("."); return man.impacts && man.impacts[mat] && man.impacts[mat][f]; }
    return man.sounds && man.sounds[kind];
  }
  const last = {};
  function play(kind, o = {}) {
    if (!on) return;
    const c = ctx(); if (!c) return;
    const now = performance.now();
    if (last[kind] && now - last[kind] < (o.gap || 60)) return;     // no machine-gun repeats
    last[kind] = now;
    manifest.then(() => {
      const list = takes(kind); if (!list || !list.length) return;
      const t = list[Math.floor(Math.random() * list.length)];
      buffer(t.file).then(b => {
        if (!b) return;
        const src = c.createBufferSource(), g = c.createGain();
        src.buffer = b;
        src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - .5) * .06);
        g.gain.value = Math.pow(10, (t.gainDb || 0) / 20) * (o.vol == null ? 1 : o.vol);
        src.connect(g).connect(master);
        src.start(0, t.lead || 0, (t.duration || b.duration) + .05);
      });
    });
  }
  // an object landing: material and how hard (0 … 1)
  function impact(material, strength) {
    const f = strength > .66 ? "hard" : strength > .3 ? "medium" : "soft";
    play(`impact.${material}.${f}`, { vol: .55 + strength * .45, gap: 40 });
  }
  // the room: leaves looping, a bird now and then
  let bed = null, birdT = 0;
  function startAmbient() {
    const c = ctx(); if (!c || bed) return;
    ambient.then(m => {
      if (!m || !amb || bed) return;
      buffer(m.bed.file).then(b => {
        if (!b || !amb || bed) return;
        const src = c.createBufferSource(), g = c.createGain();
        src.buffer = b; src.loop = true; g.gain.value = 0;
        g.gain.linearRampToValueAtTime(Math.pow(10, (m.bed.gainDb || 0) / 20) * .5, c.currentTime + 2.5);
        src.connect(g).connect(master); src.start();
        bed = { src, g };
        const bird = () => {
          if (!bed) return;
          const t = m.birds[Math.floor(Math.random() * m.birds.length)];
          buffer(t.file).then(bb => {
            if (!bb || !bed) return;
            const s2 = c.createBufferSource(), g2 = c.createGain(), pan = c.createStereoPanner ? c.createStereoPanner() : null;
            s2.buffer = bb; g2.gain.value = Math.pow(10, (t.gainDb || 0) / 20) * .35;
            if (pan) { pan.pan.value = .3 + Math.random() * .6; s2.connect(g2).connect(pan).connect(master); } else s2.connect(g2).connect(master);
            s2.start();
          });
          birdT = setTimeout(bird, 9000 + Math.random() * 22000);
        };
        birdT = setTimeout(bird, 4000 + Math.random() * 6000);
      });
    });
  }
  function stopAmbient() {
    clearTimeout(birdT);
    if (!bed) return;
    const b = bed; bed = null;
    try { b.g.gain.linearRampToValueAtTime(0, ac.currentTime + .8); setTimeout(() => { try { b.src.stop(); } catch {} }, 900); } catch {}
  }
  function setOn(v) { on = v; put(SKEY, on); if (master) master.gain.value = on ? 1 : 0; if (on && amb) startAmbient(); dispatchEvent(new CustomEvent("deskSound", { detail: { on, amb } })); }
  function setAmb(v) { amb = v; put(AKEY, amb); if (amb && on) startAmbient(); else stopAmbient(); dispatchEvent(new CustomEvent("deskSound", { detail: { on, amb } })); }
  // browsers only let sound start after a gesture
  addEventListener("pointerdown", () => { ctx(); if (on && amb) startAmbient(); }, { once: false, capture: true, passive: true });
  addEventListener("keydown", e => {
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "m" || e.key === "M") { ctx(); if (e.shiftKey) setAmb(!amb); else setOn(!on); }
  });
  window.Sound = { play, impact, setOn, setAmb, get on() { return on; }, get amb() { return amb; } };
})();

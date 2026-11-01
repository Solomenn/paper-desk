/* Sounds for the desk: real foley from sasshi (sounds/manifest.json), one take at random per play, its own
   gain trim, start (lead) and length. The room's ambience (the stove, the wind and snow outside) is off until asked for.
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
  function buffer(file) {
    if (buffers.has(file)) return Promise.resolve(buffers.get(file));
    if (loading.has(file)) return loading.get(file);
    const p = fetch(base + file).then(r => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    }).then(a => new Promise((res, rej) => {
      const c = ctx();
      if (!c) return rej(new Error("AudioContext unavailable"));
      c.decodeAudioData(a, res, rej);
    })).then(b => { buffers.set(file, b); return b; })
      .catch(() => null).finally(() => loading.delete(file));
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
  /* the room (雪国驿舍): the stove — a low roar and the wood crackling — and the wind with the snow outside, muffled by the
     glass. Made here, not recorded. Night: the fire is up and the wind is the loudest thing outside; day: the fire low. */
  let bed = null, crackT = 0;
  const night = () => document.documentElement.dataset.theme !== "day";
  function noise(c, secs, brown) {
    const b = c.createBuffer(1, c.sampleRate * secs, c.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }
  function loop(c, buf, filters, gain) {
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; src.loopStart = 0; src.start(0, Math.random() * buf.duration);
    let node = src; filters.forEach(f => { node.connect(f); node = f; }); const g = c.createGain(); g.gain.value = 0; node.connect(g).connect(master);
    g.gain.linearRampToValueAtTime(gain, c.currentTime + 3); return { src, g };
  }
  function levels() { return night() ? { roar: .16, wind: .07, crack: 1 } : { roar: .06, wind: .05, crack: .45 }; }
  function startAmbient() {
    const c = ctx(); if (!c || bed) return;
    const L = levels(), brown = noise(c, 6, true), white = noise(c, 5, false);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    const roar = loop(c, brown, [lp], L.roar);
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 520; bp.Q.value = .5;
    const mf = c.createBiquadFilter(); mf.type = "lowpass"; mf.frequency.value = 900;
    const wind = loop(c, white, [bp, mf], L.wind);
    // gusts: the wind rises and falls, the fire breathes
    const gust = () => { if (!bed) return; const L2 = levels(), t = c.currentTime, k = .45 + Math.random() * .9;
      wind.g.gain.linearRampToValueAtTime(L2.wind * k, t + 2 + Math.random() * 3); bp.frequency.linearRampToValueAtTime(380 + k * 320, t + 3);
      roar.g.gain.linearRampToValueAtTime(L2.roar * (.75 + Math.random() * .5), t + 1.5); bed.gT = setTimeout(gust, 2500 + Math.random() * 3500); };
    bed = { roar, wind, gT: setTimeout(gust, 1500) };
    // the crackle: short dry snaps, now one, now a little run of them
    const snap = (v) => {
      const len = .004 + Math.random() * .02, b = c.createBuffer(1, Math.ceil(c.sampleRate * len), c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "highpass"; f.frequency.value = 900 + Math.random() * 2500;
      g.gain.value = v; s.connect(f).connect(g).connect(master); s.start();
    };
    const crackle = () => {
      if (!bed) return; const L2 = levels();
      const n = Math.random() < .25 ? 2 + Math.floor(Math.random() * 5) : 1;
      for (let k = 0; k < n; k++) setTimeout(() => bed && snap((.04 + Math.random() * .14) * L2.crack), k * (20 + Math.random() * 70));
      crackT = setTimeout(crackle, (night() ? 120 : 260) + Math.random() * (night() ? 900 : 1800));
    };
    crackT = setTimeout(crackle, 800);
  }
  function stopAmbient() {
    clearTimeout(crackT);
    if (!bed) return;
    const b = bed; bed = null; clearTimeout(b.gT);
    try { [b.roar, b.wind].forEach(x => x.g.gain.linearRampToValueAtTime(0, ac.currentTime + .8)); setTimeout(() => { try { b.roar.src.stop(); b.wind.src.stop(); } catch {} }, 900); } catch {}
  }
  addEventListener("deskTheme", () => { if (!bed) return; const L = levels(), t = ac.currentTime; bed.roar.g.gain.linearRampToValueAtTime(L.roar, t + 2); bed.wind.g.gain.linearRampToValueAtTime(L.wind, t + 2); });
  function setOn(v) { on = v; put(SKEY, on); if (master) master.gain.value = on ? 1 : 0; if (on && amb) startAmbient(); dispatchEvent(new CustomEvent("deskSound", { detail: { on, amb } })); }
  function setAmb(v) { amb = v; put(AKEY, amb); if (amb && on) startAmbient(); else stopAmbient(); dispatchEvent(new CustomEvent("deskSound", { detail: { on, amb } })); }
  // browsers only let sound start after a gesture
  addEventListener("pointerdown", () => { ctx(); if (on && amb) startAmbient(); }, { once: false, capture: true, passive: true });
  addEventListener("keydown", e => {
    const a = document.activeElement;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "m" || e.key === "M") { ctx(); if (e.shiftKey) setAmb(!amb); else setOn(!on); }
  });
  async function preloadSounds() {
    const m = await manifest;
    if (!m) return 0;

    const files = new Set();
    Object.values(m.sounds || {}).forEach(list => {
      if (Array.isArray(list)) list.forEach(take => take && take.file && files.add(take.file));
    });
    Object.values(m.impacts || {}).forEach(materials => {
      Object.values(materials || {}).forEach(list => {
        if (Array.isArray(list)) list.forEach(take => take && take.file && files.add(take.file));
      });
    });

    const queue = Array.from(files);
    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) await buffer(queue[cursor++]);
    }
    await Promise.all(Array.from({length:Math.min(4, queue.length)}, worker));
    return buffers.size;
  }

  window.Sound = { play, impact, setOn, setAmb, preload: preloadSounds, get on() { return on; }, get amb() { return amb; } };
})();

"use strict";
// =====================================================
//  TON: kurze Klänge, mit dem Browser erzeugt (keine Tondateien). Abschaltbar im Titel.
// =====================================================

const ton = (() => {
  let ctx = null;
  const zuletzt = {};
  function audio() {
    if (!SP.ton) return null;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
    } catch (e) { return null; }
    return ctx;
  }
  // Ein Ton: Frequenz von f1 nach f2, Dauer d, Lautstärke v. "abstand": nicht öfter als alle x Sekunden
  function piep(name, f1, f2, d, v, form = "square", abstand = 0) {
    const c = audio(); if (!c) return;
    const jetzt = c.currentTime;
    if (abstand && zuletzt[name] && jetzt - zuletzt[name] < abstand) return;
    zuletzt[name] = jetzt;
    const o = c.createOscillator(), g = c.createGain();
    o.type = form; o.frequency.setValueAtTime(f1, jetzt); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), jetzt + d);
    g.gain.setValueAtTime(v, jetzt); g.gain.exponentialRampToValueAtTime(0.0001, jetzt + d);
    o.connect(g).connect(c.destination); o.start(jetzt); o.stop(jetzt + d + 0.02);
  }
  return {
    an: () => audio(),
    treffer: () => piep("treffer", 220, 120, 0.05, 0.025, "square", 0.05),
    schuss: () => piep("schuss", 900, 500, 0.05, 0.02, "square", 0.08),
    laser: () => piep("laser", 1400, 300, 0.25, 0.04, "sawtooth"),
    xp: () => piep("xp", 1200, 1700, 0.06, 0.03, "sine", 0.04),
    muenze: () => { piep("m1", 1300, 1300, 0.06, 0.05, "square"); setTimeout(() => piep("m2", 1750, 1750, 0.1, 0.05, "square"), 60); },
    autsch: () => piep("autsch", 300, 90, 0.18, 0.08, "sawtooth", 0.2),
    levelUp: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => piep("lvl" + i, f, f, 0.14, 0.06, "triangle"), i * 80)),
    ende: sieg => (sieg ? [523, 659, 784, 1047, 1319] : [392, 330, 262, 196]).forEach((f, i) => setTimeout(() => piep("e" + i, f, f, 0.25, 0.07, "triangle"), i * 160)),
  };
})();

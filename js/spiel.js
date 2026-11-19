"use strict";
// =====================================================
//  SPIEL: eine Runde – Bewegung, Gegnerwellen, Waffen, Treffer, Erfahrung, Level-Aufstieg.
//  Zeichnen: am Ende dieser Datei (zeichneSpiel). Bildschirme und Menüs: ui.js.
// =====================================================

let G = null;                 // die laufende Runde (null = keine)
const ZELLE = 64;             // Raster für schnelle "Wer ist in der Nähe?"-Abfragen
const raster = new Map();
const SPIELER_R = 13;

// ----- Werte: Grundwerte + Werkstatt + Ausrüstung -----
function berechneWerte() {
  const w = { schaden: 1, tempo: 1, cd: 1, bereich: 1, anzahl: 0, magnet: 1, xp: 1, maxLeben: 100, ruestung: 0 };
  const dazu = (wert, n) => { for (const k in wert) w[k] += wert[k] * n; };
  for (const id in WERKSTATT) dazu(WERKSTATT[id].wert, werkstattStufe(id));
  for (const id in G.ausr) dazu(AUSRUESTUNG[id].wert, G.ausr[id]);
  dazu(G.fig.bonus || {}, 1);
  w.cd = Math.max(0.45, w.cd);
  const alt = G.w ? G.w.maxLeben : w.maxLeben;
  G.w = w;
  if (w.maxLeben > alt) G.leben += w.maxLeben - alt;
  G.leben = Math.min(G.leben, w.maxLeben);
}

// Werte einer Waffe auf einer Stufe (inkl. Spieler-Werte)
function waffenWerte(id, stufe) {
  const W = WAFFEN[id], b = { ...W.basis };
  for (let i = 0; i < stufe - 1; i++) {
    const s = W.stufen[i];
    for (const k in s) b[k] = k === "cd" ? b[k] * (1 + s[k]) : (b[k] || 0) + s[k];
  }
  b.schaden *= G.w.schaden;
  b.cd *= G.w.cd;
  if (b.anzahl !== undefined) b.anzahl += G.w.anzahl;
  if (b.bereich !== undefined) b.bereich *= G.w.bereich;
  return b;
}

// ----- Neue Runde -----
function neueRunde(figurId, karteId = "farben") {
  const fig = FIGUREN.find(f => f.id === figurId) || FIGUREN[0];
  const karte = KARTEN.find(k => k.id === karteId && !k.gesperrt) || KARTEN[0];
  G = {
    fig, karte, flecken: [], zeit: 0, x: 0, y: 0, leben: 100, blick: 1, richtung: { x: 1, y: 0 }, laufZeit: 0, unverwundbar: 0,
    lvl: 1, xp: 0, xpNext: xpBis(1), offeneLevel: 0, kills: 0, euro: 0,
    waffen: [], ausr: {}, gegner: [], geschosse: [], funde: [], pfuetzen: [], effekte: [], texte: [],
    spawnRest: 0, bossNr: 0, ende: null, pause: false, schaden: {}, w: null, partikel: [], wackeln: 0, rotBlitz: 0, lvlBlitz: 0,
  };
  berechneWerte();
  G.leben = G.w.maxLeben;
  gibWaffe(fig.start);
}

function gibWaffe(id) {
  const vorhanden = G.waffen.find(w => w.id === id);
  if (vorhanden) vorhanden.stufe++;
  else G.waffen.push({ id, stufe: 1, t: 0.3, aktiv: 0, winkel: 0 });
}
function gibAusruestung(id) {
  G.ausr[id] = (G.ausr[id] || 0) + 1;
  berechneWerte();
}

// ----- Raster -----
const schluessel = (cx, cy) => cx * 100003 + cy;
function rasterBauen() {
  raster.clear();
  for (const e of G.gegner) {
    const k = schluessel(Math.floor(e.x / ZELLE), Math.floor(e.y / ZELLE));
    let l = raster.get(k);
    if (!l) { l = []; raster.set(k, l); }
    l.push(e);
  }
}
function inDerNaehe(x, y, r, fn) {
  const c0 = Math.floor((x - r) / ZELLE), c1 = Math.floor((x + r) / ZELLE);
  const r0 = Math.floor((y - r) / ZELLE), r1 = Math.floor((y + r) / ZELLE);
  for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
    const l = raster.get(schluessel(cx, cy));
    if (l) for (let i = 0; i < l.length; i++) if (!l[i].tot) fn(l[i]);
  }
}

// Die n nächsten Gegner (für Zielwaffen)
function naechsteGegner(n, maxAbstand = 520) {
  const liste = [];
  for (const e of G.gegner) {
    if (e.tot) continue;
    const d = (e.x - G.x) ** 2 + (e.y - G.y) ** 2;
    if (d < maxAbstand * maxAbstand) liste.push([d, e]);
  }
  liste.sort((a, b) => a[0] - b[0]);
  return liste.slice(0, n).map(x => x[1]);
}

// ----- Gegner erscheinen lassen -----
function sichtRadius() { return Math.hypot(ansicht.w, ansicht.h) / 2; }
function spawneGegner(typ, boss = false) {
  const d = GEGNER[typ], a = Math.random() * Math.PI * 2, r = sichtRadius() + 40 + d.r;
  const faktor = 1 + (G.zeit / 60) * LEBEN_PRO_MINUTE;
  const v = d.varianten ? Math.floor(Math.random() * d.varianten) : 0;
  G.gegner.push({ typ, v, farbe: d.varianten ? FARBTOEPFE[v % FARBTOEPFE.length] : null, x: G.x + Math.cos(a) * r, y: G.y + Math.sin(a) * r, leben: d.leben * faktor, maxLeben: d.leben * faktor,
    r: d.r, tempo: d.tempo * (0.92 + Math.random() * 0.16), schaden: d.schaden, xp: d.xp, boss, kx: 0, ky: 0, blitz: 0, langsamBis: 0, treffer: {} });
  if (boss) { zeigeBanner(`⚠️ ${d.name} kommt!`); wackeln(12); }
}
function spawnen(dt) {
  const welle = WELLEN[Math.min(WELLEN.length - 1, Math.floor(G.zeit / 60))];
  G.spawnRest += welle.rate * dt;
  while (G.spawnRest >= 1) {
    G.spawnRest--;
    if (G.gegner.length < MAX_GEGNER) spawneGegner(G.karte.gegner[welle.typen[Math.floor(Math.random() * welle.typen.length)]]);
  }
  const bosse = G.karte.bosse;
  while (G.bossNr < bosse.length && G.zeit >= bosse[G.bossNr][0]) spawneGegner(bosse[G.bossNr++][1], true);
}

// ----- Schaden -----
function triff(e, schaden, quelle, stossX = 0, stossY = 0, stoss = 0) {
  if (e.tot) return;
  e.leben -= schaden;
  e.blitz = 0.1;
  G.schaden[quelle] = (G.schaden[quelle] || 0) + schaden;
  if (stoss && !e.boss) { e.kx += stossX * stoss; e.ky += stossY * stoss; }
  if (G.texte.length < 50) G.texte.push({ x: e.x + (Math.random() - 0.5) * 10, y: e.y - e.r, t: 0.6, text: String(Math.round(schaden)), gross: schaden >= 40 });
  funken(e.x - stossX * e.r * 0.5, e.y - stossY * e.r * 0.5, 2);
  ton.treffer();
  if (e.leben <= 0) besiegt(e);
}
function besiegt(e) {
  e.tot = true;
  G.kills++;
  zerplatzen(e);
  if (G.karte.flecken) {   // Farbklecks bleibt am Boden liegen
    G.flecken.push({ x: e.x, y: e.y + e.r * 0.4, r: e.r * (e.boss ? 2.6 : 1.5), farbe: e.farbe || FARBTOEPFE[Math.floor(Math.random() * FARBTOEPFE.length)],
      form: Math.floor(Math.random() * 3), dreh: Math.random() * 6, bis: G.zeit + 25 });
    if (G.flecken.length > 160) G.flecken.shift();
  }
  if (e.boss) { wackeln(16); ringwelle(e.x, e.y, "#ffffff", 140, 0.7); zeigeBanner(`🏆 ${GEGNER[e.typ].name} besiegt!`); }
  const art = e.xp >= 5 ? "xp3" : e.xp >= 2 ? "xp2" : "xp1";
  G.funde.push({ art, x: e.x, y: e.y, wert: e.xp });
  if (e.boss) {
    G.funde.push({ art: "kiste", x: e.x, y: e.y + 20 });
    for (let i = 0; i < 12; i++) G.funde.push({ art: "euro", x: e.x + (Math.random() - 0.5) * 80, y: e.y + (Math.random() - 0.5) * 80, wert: 5 });
  } else if (Math.random() < 0.025) G.funde.push({ art: "euro", x: e.x, y: e.y, wert: 1 + Math.floor(Math.random() * 3) });
  else if (Math.random() < 0.004) G.funde.push({ art: "wurst", x: e.x, y: e.y });
}

// ----- Waffen -----
const WAFFEN_LOGIK = {
  akkuschrauber(w, s, dt) {
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    const ziele = naechsteGegner(s.anzahl);
    for (let i = 0; i < s.anzahl; i++) {
      const z = ziele[i % Math.max(1, ziele.length)];
      let dx = z ? z.x - G.x : G.blick, dy = z ? z.y - G.y : 0;
      const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const streu = ziele.length < s.anzahl ? (i - (s.anzahl - 1) / 2) * 0.18 : 0;
      const a = Math.atan2(dy, dx) + streu;
      G.geschosse.push({ art: "schraube", quelle: "akkuschrauber", x: G.x, y: G.y, vx: Math.cos(a) * s.tempo, vy: Math.sin(a) * s.tempo,
        r: 6, schaden: s.schaden, durch: s.durchschlag, leben: 1.3, getroffen: new Set() });
    }
    ton.schuss();
  },
  hammer(w, s, dt) {
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    const z = naechsteGegner(1)[0];
    const basis = z ? Math.atan2(z.y - G.y, z.x - G.x) : Math.atan2(G.richtung.y, G.richtung.x);
    for (let i = 0; i < s.anzahl; i++) {
      const a = basis + (i - (s.anzahl - 1) / 2) * 0.5;
      G.geschosse.push({ art: "hammer", quelle: "hammer", bumerang: true, x: G.x, y: G.y, vx: Math.cos(a) * s.tempo, vy: Math.sin(a) * s.tempo,
        r: 13 * s.bereich, schaden: s.schaden, durch: Infinity, leben: 3.5, alter: 0, dreh: 0, groesse: s.bereich, trefferZeit: new Map() });
    }
  },
  kreissaege(w, s, dt) {
    if (w.aktiv > 0) {
      w.aktiv -= dt;
      w.winkel += s.tempo * dt;
      const R = 78 * s.bereich, r = 15 * s.bereich;
      w.blaetter = [];
      for (let i = 0; i < s.anzahl; i++) {
        const a = w.winkel + i / s.anzahl * Math.PI * 2, bx = G.x + Math.cos(a) * R, by = G.y + Math.sin(a) * R;
        w.blaetter.push([bx, by, r]);
        inDerNaehe(bx, by, r + 20, e => {
          if ((e.x - bx) ** 2 + (e.y - by) ** 2 > (r + e.r) ** 2) return;
          if ((e.treffer.saege || -9) > G.zeit - 0.35) return;
          e.treffer.saege = G.zeit;
          const l = Math.hypot(e.x - G.x, e.y - G.y) || 1;
          triff(e, s.schaden, "kreissaege", (e.x - G.x) / l, (e.y - G.y) / l, 120);
        });
      }
      if (w.aktiv <= 0) { w.t = s.cd; w.blaetter = null; }
      return;
    }
    if ((w.t -= dt) <= 0) w.aktiv = s.dauer;
  },
  nagelpistole(w, s, dt) {
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    const basis = Math.atan2(G.richtung.y, G.richtung.x);
    for (let i = 0; i < s.anzahl; i++) {
      const a = basis + (i - (s.anzahl - 1) / 2) * 0.16;
      G.geschosse.push({ art: "nagel", quelle: "nagelpistole", x: G.x, y: G.y, vx: Math.cos(a) * s.tempo, vy: Math.sin(a) * s.tempo,
        r: 5, schaden: s.schaden, durch: s.durchschlag, leben: 0.8, getroffen: new Set() });
    }
    ton.schuss();
  },
  bauschaum(w, s, dt) {
    w.radius = 56 * s.bereich;
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    inDerNaehe(G.x, G.y, w.radius + 20, e => {
      const d = Math.hypot(e.x - G.x, e.y - G.y);
      if (d > w.radius + e.r) return;
      triff(e, s.schaden, "bauschaum", (e.x - G.x) / (d || 1), (e.y - G.y) / (d || 1), 40);
      e.langsamBis = G.zeit + 0.6;
    });
  },
  wasserwaage(w, s, dt) {
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    const breite = 14 * s.bereich, laenge = sichtRadius();
    const richtungen = [[1, 0], [0, 1], [0.7071, 0.7071], [0.7071, -0.7071]].slice(0, Math.min(4, s.anzahl));
    for (const [rx, ry] of richtungen) {
      G.effekte.push({ art: "laser", x: G.x, y: G.y, rx, ry, laenge, breite, t: 0.3, dauer: 0.3 });
      for (const e of G.gegner) {
        if (e.tot) continue;
        const dx = e.x - G.x, dy = e.y - G.y, entlang = dx * rx + dy * ry, quer = Math.abs(dx * ry - dy * rx);
        if (Math.abs(entlang) < laenge && quer < breite / 2 + e.r) triff(e, s.schaden, "wasserwaage");
      }
    }
    ton.laser();
  },
  farbeimer(w, s, dt) {
    if ((w.t -= dt) > 0) return;
    w.t = s.cd;
    const ziele = naechsteGegner(12, 380);
    for (let i = 0; i < s.anzahl; i++) {
      const z = ziele.length ? ziele[Math.floor(Math.random() * ziele.length)] : null;
      const zx = z ? z.x : G.x + (Math.random() - 0.5) * 300, zy = z ? z.y : G.y + (Math.random() - 0.5) * 300;
      G.geschosse.push({ art: "eimer", quelle: "farbeimer", wurf: true, x: G.x, y: G.y, sx: G.x, sy: G.y, zx, zy, alter: 0, flug: 0.55,
        r: 0, schaden: s.schaden, dauer: s.dauer, groesse: 42 * s.bereich, durch: 0, leben: 2 });
    }
  },
};

// ----- Aktualisieren -----
function aktualisiere(dt) {
  G.zeit += dt;
  if (G.zeit >= SPIEL_DAUER) { beendeRunde(true); return; }

  // Bewegung
  const tempo = 150 * G.w.tempo;
  const ex = eingabe.x, ey = eingabe.y, el = Math.hypot(ex, ey);
  if (el > 0.1) {
    const f = Math.min(1, el);
    G.x += ex / el * f * tempo * dt; G.y += ey / el * f * tempo * dt;
    G.richtung = { x: ex / el, y: ey / el };
    if (Math.abs(ex) > 0.1) G.blick = Math.sign(ex);
    G.laufZeit += dt;
  }
  if (G.unverwundbar > 0) G.unverwundbar -= dt;

  spawnen(dt);
  rasterBauen();

  // Gegner
  const weit = sichtRadius() + 220;
  for (const e of G.gegner) {
    if (e.tot) continue;
    let dx = G.x - e.x, dy = G.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > weit && !e.boss) {   // zu weit weg: auf der anderen Seite wieder auftauchen
      e.x = G.x + dx / d * (sichtRadius() + 30); e.y = G.y + dy / d * (sichtRadius() + 30);
      continue;
    }
    const v = e.tempo * (e.langsamBis > G.zeit ? 0.5 : 1);
    e.x += (dx / d * v + e.kx) * dt; e.y += (dy / d * v + e.ky) * dt;
    e.kx *= 0.86; e.ky *= 0.86;
    if (e.blitz > 0) e.blitz -= dt;
    // Abstand zu Nachbarn
    inDerNaehe(e.x, e.y, e.r * 2, o => {
      if (o === e) return;
      const ox = e.x - o.x, oy = e.y - o.y, min = e.r + o.r, q = ox * ox + oy * oy;
      if (q < min * min && q > 0.01) {
        const l = Math.sqrt(q), druck = (min - l) * 0.5 * (o.boss ? 2 : e.boss ? 0 : 1);
        e.x += ox / l * druck; e.y += oy / l * druck;
      }
    });
    // Berührt den Spieler?
    if (d < e.r + SPIELER_R && G.unverwundbar <= 0) {
      G.leben -= Math.max(1, e.schaden - G.w.ruestung);
      G.unverwundbar = 0.5;
      G.getroffen = 0.25;
      G.rotBlitz = 0.35;
      wackeln(5);
      if (G.texte.length < 50) G.texte.push({ x: G.x, y: G.y - 30, t: 0.7, text: `−${Math.max(1, e.schaden - G.w.ruestung)}`, farbe: "#ff5a63", gross: true });
      ton.autsch();
    }
  }
  if (G.getroffen > 0) G.getroffen -= dt;

  // Waffen
  for (const w of G.waffen) WAFFEN_LOGIK[w.id](w, waffenWerte(w.id, w.stufe), dt);

  // Geschosse
  for (const g of G.geschosse) {
    if (g.wurf) {   // Farbeimer: fliegt im Bogen, wird zur Pfütze
      g.alter += dt;
      const p = Math.min(1, g.alter / g.flug);
      g.x = g.sx + (g.zx - g.sx) * p; g.y = g.sy + (g.zy - g.sy) * p - Math.sin(p * Math.PI) * 60;
      if (p >= 1) { g.leben = 0; G.pfuetzen.push({ x: g.zx, y: g.zy, r: g.groesse, bis: G.zeit + g.dauer, schaden: g.schaden, t: 0 }); }
      continue;
    }
    g.leben -= dt;
    if (g.bumerang) {
      g.alter += dt; g.dreh += dt * 14;
      if (g.alter > 0.42) {
        const dx = G.x - g.x, dy = G.y - g.y, l = Math.hypot(dx, dy) || 1;
        g.vx += dx / l * 1700 * dt; g.vy += dy / l * 1700 * dt;
        const v = Math.hypot(g.vx, g.vy); if (v > 640) { g.vx *= 640 / v; g.vy *= 640 / v; }
        if (l < 24 && g.alter > 0.7) g.leben = 0;
      } else { g.vx *= 1 - 2.2 * dt; g.vy *= 1 - 2.2 * dt; }
    }
    g.x += g.vx * dt; g.y += g.vy * dt;
    inDerNaehe(g.x, g.y, g.r + 20, e => {
      if (g.leben <= 0 || g.durch <= 0) return;
      if ((e.x - g.x) ** 2 + (e.y - g.y) ** 2 > (e.r + g.r) ** 2) return;
      if (g.trefferZeit) {
        if ((g.trefferZeit.get(e) || -9) > G.zeit - 0.4) return;
        g.trefferZeit.set(e, G.zeit);
      } else {
        if (g.getroffen.has(e)) return;
        g.getroffen.add(e);
        g.durch--;
      }
      const v = Math.hypot(g.vx, g.vy) || 1;
      triff(e, g.schaden, g.quelle, g.vx / v, g.vy / v, 90);
    });
    if (g.durch <= 0) g.leben = 0;
  }

  // Farbpfützen
  for (const p of G.pfuetzen) {
    if ((p.t -= dt) > 0) continue;
    p.t = 0.4;
    inDerNaehe(p.x, p.y, p.r + 20, e => {
      if ((e.x - p.x) ** 2 + ((e.y - p.y) * 1.6) ** 2 < (p.r + e.r) ** 2) { triff(e, p.schaden, "farbeimer"); e.langsamBis = G.zeit + 0.5; }
    });
  }

  // Funde einsammeln
  const magnet = 90 * G.w.magnet;
  for (const f of G.funde) {
    const dx = G.x - f.x, dy = G.y - f.y, d = Math.hypot(dx, dy);
    if (f.zieht || d < magnet || (f.art === "kiste" && d < 40)) {
      f.zieht = true;
      f.v = Math.min(700, (f.v || 120) + 900 * dt);
      f.x += dx / (d || 1) * f.v * dt; f.y += dy / (d || 1) * f.v * dt;
      if (d < 16) { f.weg = true; sammle(f); }
    }
  }

  // Effekte, Texte
  for (const e of G.effekte) e.t -= dt;
  aktualisierePartikel(dt);
  if (G.rotBlitz > 0) G.rotBlitz -= dt;
  if (G.lvlBlitz > 0) G.lvlBlitz -= dt;
  for (const t of G.texte) { t.t -= dt; t.y -= 40 * dt; }

  // Aufräumen
  G.gegner = G.gegner.filter(e => !e.tot);
  G.geschosse = G.geschosse.filter(g => g.leben > 0);
  G.funde = G.funde.filter(f => !f.weg);
  G.pfuetzen = G.pfuetzen.filter(p => p.bis > G.zeit);
  if (G.flecken.length && G.flecken[0].bis < G.zeit) G.flecken = G.flecken.filter(f => f.bis > G.zeit);
  G.effekte = G.effekte.filter(e => e.t > 0);
  G.texte = G.texte.filter(t => t.t > 0);
  if (G.funde.length > 600) zusammenlegen();

  if (G.leben <= 0) { G.leben = 0; beendeRunde(false); }
}

// Viele Erfahrungs-Schrauben weit weg: zu einer großen zusammenlegen
function zusammenlegen() {
  let summe = 0;
  G.funde = G.funde.filter(f => {
    if (f.art.startsWith("xp") && Math.hypot(f.x - G.x, f.y - G.y) > 400) { summe += f.wert; return false; }
    return true;
  });
  if (summe) G.funde.push({ art: "xp3", x: G.x + 300, y: G.y, wert: summe });
}

function sammle(f) {
  if (f.art.startsWith("xp")) {
    G.xp += f.wert * G.w.xp;
    ton.xp();
    if (f.art !== "xp1") glitzer(G.x, G.y - 10, f.art === "xp3" ? "#ffe9a0" : "#bfe3ff");
    while (G.xp >= G.xpNext) { G.xp -= G.xpNext; G.lvl++; G.xpNext = xpBis(G.lvl); G.offeneLevel++; ringwelle(G.x, G.y, "#3aa935", 110, 0.6); G.lvlBlitz = 0.6; }
    if (G.offeneLevel > 0) zeigeLevelAuswahl();
  } else if (f.art === "euro") { G.euro += f.wert; ton.muenze(); }
  else if (f.art === "wurst") { G.leben = Math.min(G.w.maxLeben, G.leben + 30); zeigeHinweis("🌭 Bratwurst! +30 Leben"); }
  else if (f.art === "kiste") oeffneKiste();
}

// ----- Level-Aufstieg: Auswahl -----
function levelOptionen() {
  const pool = [];
  for (const w of G.waffen) if (w.stufe < 8) pool.push({ art: "waffe", id: w.id, stufe: w.stufe + 1 });
  for (const id in G.ausr) if (G.ausr[id] < (AUSRUESTUNG[id].max || 5)) pool.push({ art: "ausr", id, stufe: G.ausr[id] + 1 });
  if (G.waffen.length < MAX_WAFFEN) for (const id in WAFFEN) if (!G.waffen.find(w => w.id === id)) pool.push({ art: "waffe", id, stufe: 1 });
  if (Object.keys(G.ausr).length < MAX_AUSRUESTUNG) for (const id in AUSRUESTUNG) if (!G.ausr[id]) pool.push({ art: "ausr", id, stufe: 1 });
  const wahl = [];
  while (wahl.length < 3 && pool.length) wahl.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  if (!wahl.length) wahl.push({ art: "heil" }, { art: "geld" });
  return wahl;
}
function waehleOption(o) {
  if (o.art === "waffe") gibWaffe(o.id);
  else if (o.art === "ausr") gibAusruestung(o.id);
  else if (o.art === "heil") G.leben = Math.min(G.w.maxLeben, G.leben + 40);
  else if (o.art === "geld") G.euro += 15;
}
function oeffneKiste() {
  const anzahl = Math.random() < 0.2 ? 3 : 1;
  const namen = [];
  for (let i = 0; i < anzahl; i++) {
    const o = levelOptionen()[0];
    waehleOption(o);
    namen.push(optionText(o).titel);
  }
  ton.levelUp();
  zeigeHinweis(`🧰 Werkzeugkiste: ${namen.join(", ")}`);
}

// ----- Zeichnen -----
const ansicht = { w: 800, h: 600, dpr: 1 };
function zeichneSpiel(x) {
  const W = ansicht.w, H = ansicht.h;
  const wx = G.wackeln ? (Math.random() - 0.5) * G.wackeln : 0, wy = G.wackeln ? (Math.random() - 0.5) * G.wackeln : 0;
  const ox = Math.round(W / 2 - G.x + wx), oy = Math.round(H / 2 - G.y + wy);
  const sx0 = W / 2 + wx, sy0 = H / 2 + wy;   // Spieler auf dem Bildschirm

  // Boden, Licht, Deko
  const b = bodenKachel(G.karte.boden), bg = BODEN_GROESSE;
  const bx = ((ox % bg) + bg) % bg - bg, by = ((oy % bg) + bg) % bg - bg;
  for (let px = bx; px < W; px += bg) for (let py = by; py < H; py += bg) x.drawImage(b.c, px, py, bg, bg);
  zeichneLicht(x, ox, oy, W, H);
  zeichneDeko(x, ox, oy, W, H, G.karte.deko);
  // Farbkleckse besiegter Gegner
  for (const f of G.flecken) {
    const fx = f.x + ox, fy = f.y + oy;
    if (fx < -80 || fy < -80 || fx > W + 80 || fy > H + 80) continue;
    const s = fleckSprite(f.farbe, f.form);
    x.globalAlpha = 0.7 * Math.min(1, (f.bis - G.zeit) / 4);
    x.save(); x.translate(fx, fy); x.rotate(f.dreh); x.scale(1, 0.62); x.drawImage(s.c, -f.r * 1.3, -f.r * 1.3, f.r * 2.6, f.r * 2.6); x.restore();
  }
  x.globalAlpha = 1;

  // Farbpfützen (mit glänzendem Rand)
  for (const p of G.pfuetzen) {
    const rest = Math.min(1, (p.bis - G.zeit) / 0.5), px = p.x + ox, py = p.y + oy;
    x.globalAlpha = 0.6 * rest; x.fillStyle = "#2f7fd6";
    x.beginPath(); x.ellipse(px, py, p.r, p.r / 1.6, 0, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 0.5 * rest; x.fillStyle = "#8fc6ff";
    x.beginPath(); x.ellipse(px - p.r * 0.3, py - p.r * 0.18, p.r * 0.35, p.r * 0.12, -0.2, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 1;
  }
  // Bauschaum
  const schaum = G.waffen.find(w => w.id === "bauschaum");
  if (schaum && schaum.radius) {
    const r = schaum.radius;
    const gr = x.createRadialGradient(sx0, sy0, r * 0.2, sx0, sy0, r);
    gr.addColorStop(0, "rgba(255,248,225,.05)"); gr.addColorStop(0.75, "rgba(255,248,225,.28)"); gr.addColorStop(1, "rgba(255,248,225,0)");
    x.fillStyle = gr; x.beginPath(); x.arc(sx0, sy0, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,.75)"; x.strokeStyle = "rgba(200,190,170,.6)"; x.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const a = i * 0.449 + G.zeit * (0.6 + (i % 3) * 0.2), rr = r * (0.5 + 0.42 * Math.sin(i * 1.7 + G.zeit * 1.3));
      x.beginPath(); x.arc(sx0 + Math.cos(a) * rr, sy0 + Math.sin(a) * rr, 3 + (i % 4) * 1.6, 0, Math.PI * 2); x.fill(); x.stroke();
    }
  }
  // Funde (mit Glanz)
  for (const f of G.funde) {
    const s = kleinSprite(f.art), fx = f.x + ox, fy = f.y + oy;
    if (fx < -30 || fy < -30 || fx > W + 30 || fy > H + 30) continue;
    const hop = f.art === "kiste" ? Math.sin(G.zeit * 4) * 2 : f.zieht ? 0 : Math.sin(G.zeit * 5 + f.x) * 1.5;
    if (f.art === "kiste" || f.art === "xp3") {
      x.globalAlpha = 0.35 + 0.15 * Math.sin(G.zeit * 6); x.fillStyle = f.art === "kiste" ? "#ffffff" : "#ffe9a0";
      x.beginPath(); x.arc(fx, fy, s.w * 0.8, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    }
    x.drawImage(s.c, fx - s.w / 2, fy - s.h / 2 + hop, s.w, s.h);
    if ((f.art === "xp3" || f.art === "euro") && Math.sin(G.zeit * 3 + f.x * 0.1) > 0.93) {
      x.fillStyle = "#ffffff"; x.fillRect(fx + 2, fy - 7, 1.6, 6); x.fillRect(fx - 0.2, fy - 4.8, 6, 1.6);
    }
  }
  // Partikel am Boden (Staub) zuerst
  // Gegner (von oben nach unten, damit vordere vorne sind)
  const sicht = G.gegner.filter(e => e.x + ox > -70 && e.x + ox < W + 70 && e.y + oy > -70 && e.y + oy < H + 70).sort((a, b) => a.y - b.y);
  for (const e of sicht) {
    const s = gegnerSprite(e.typ, e.v), ex = e.x + ox, ey = e.y + oy;
    const schritt = Math.sin(G.zeit * 14 + e.x * 0.07);
    x.fillStyle = "rgba(0,0,0,.22)"; x.beginPath(); x.ellipse(ex, ey + s.h / 2 - 2, s.w * 0.36, 4 + e.r * 0.15, 0, 0, Math.PI * 2); x.fill();
    if (e.boss) {
      x.globalAlpha = 0.25 + 0.15 * Math.sin(G.zeit * 5); x.fillStyle = "#e30613";
      x.beginPath(); x.ellipse(ex, ey + s.h / 2 - 2, s.w * 0.6, 12, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
    }
    const bild = e.blitz > 0 ? weissSprite(`gegner-${e.typ}-${e.v}`, s) : s;
    x.save(); x.translate(ex, ey - Math.abs(schritt) * 2);
    x.scale((e.x > G.x ? -1 : 1) * (1 + schritt * 0.03), 1 - schritt * 0.03);
    x.drawImage(bild.c, -s.w / 2, -s.h / 2, s.w, s.h);
    x.restore();
    if (e.boss) {
      const bw = Math.max(60, s.w); x.fillStyle = "rgba(0,0,0,.55)"; rundRechteck(x, ex - bw / 2 - 2, ey - s.h / 2 - 16, bw + 4, 9, 4); x.fill();
      x.fillStyle = "#e30613"; rundRechteck(x, ex - bw / 2, ey - s.h / 2 - 14, bw * Math.max(0, e.leben / e.maxLeben), 5, 2.5); x.fill();
    }
  }
  // Besiegte Gegner: kurz aufblähen und verblassen
  for (const t of G.effekte) if (t.art === "tod") {
    const s = weissSprite(`gegner-${t.typ}-${t.v}`, gegnerSprite(t.typ, t.v)), a = t.t / t.dauer;
    x.globalAlpha = a * 0.9;
    x.save(); x.translate(t.x + ox, t.y + oy); x.scale((t.links ? -1 : 1) * (1 + (1 - a) * 0.5), 1 + (1 - a) * 0.5);
    x.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); x.restore();
    x.globalAlpha = 1;
  }

  // Spieler
  const laeuft = Math.hypot(eingabe.x, eingabe.y) > 0.1;
  const bildNr = laeuft ? Math.floor(G.laufZeit * 8) % 2 : 0, ps = figurSprite(G.fig, bildNr);
  const hop = laeuft ? Math.abs(Math.sin(G.laufZeit * 12)) * 2.5 : Math.sin(G.zeit * 3) * 0.6;
  x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.ellipse(sx0, sy0 + 22, 15, 5, 0, 0, Math.PI * 2); x.fill();
  if (G.lvlBlitz > 0) { x.globalAlpha = G.lvlBlitz; x.fillStyle = "#3aa935"; x.beginPath(); x.ellipse(sx0, sy0 + 20, 26, 9, 0, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; }
  x.save(); x.translate(sx0, sy0 - 4 - hop);
  if (G.blick < 0) x.scale(-1, 1);
  const bild = G.getroffen > 0 && Math.floor(G.zeit * 30) % 2 ? weissSprite(`figur-${G.fig.id}-${bildNr}`, ps) : ps;
  x.drawImage(bild.c, -ps.w / 2, -ps.h / 2, ps.w, ps.h);
  x.restore();
  // Lebensbalken unter dem Spieler
  const anteil = Math.max(0, G.leben / G.w.maxLeben);
  x.fillStyle = "rgba(0,0,0,.55)"; rundRechteck(x, sx0 - 22, sy0 + 27, 44, 7, 3.5); x.fill();
  x.fillStyle = anteil > 0.3 ? "#3aa935" : "#e30613"; rundRechteck(x, sx0 - 21, sy0 + 28, 42 * anteil, 5, 2.5); x.fill();

  // Kreissägen mit Bewegungsspur
  for (const w of G.waffen) if (w.blaetter) {
    const s = kleinSprite("saegeblatt");
    for (const [bxx, byy, r] of w.blaetter) {
      x.globalAlpha = 0.25; x.strokeStyle = "#ffffff"; x.lineWidth = r * 0.9;
      const R = Math.hypot(bxx - G.x, byy - G.y), a = Math.atan2(byy - G.y, bxx - G.x);
      x.beginPath(); x.arc(sx0, sy0, R, a - 0.5, a); x.stroke(); x.globalAlpha = 1;
      x.save(); x.translate(bxx + ox, byy + oy); x.rotate(G.zeit * 18); x.drawImage(s.c, -r, -r, r * 2, r * 2); x.restore();
    }
  }
  // Geschosse (mit Leuchtspur)
  for (const g of G.geschosse) {
    const s = kleinSprite(g.art), gx = g.x + ox, gy = g.y + oy;
    if (gx < -40 || gy < -40 || gx > W + 40 || gy > H + 40) continue;
    if (g.art === "schraube" || g.art === "nagel") {
      const v = Math.hypot(g.vx, g.vy) || 1, lx = g.vx / v, ly = g.vy / v;
      const gr = x.createLinearGradient(gx, gy, gx - lx * 26, gy - ly * 26);
      gr.addColorStop(0, "rgba(255,255,255,.75)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      x.strokeStyle = gr; x.lineWidth = 3; x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx - lx * 26, gy - ly * 26); x.stroke();
    }
    if (g.art === "hammer") {
      for (let i = 1; i <= 2; i++) {
        x.globalAlpha = 0.18 / i; x.save(); x.translate(gx - g.vx * 0.02 * i, gy - g.vy * 0.02 * i); x.rotate(g.dreh - i * 0.5); x.scale(g.groesse, g.groesse);
        x.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); x.restore();
      }
      x.globalAlpha = 1;
    }
    x.save(); x.translate(gx, gy);
    if (g.art === "hammer") { x.rotate(g.dreh); x.scale(g.groesse, g.groesse); }
    else if (g.art === "eimer") { x.rotate(g.alter * 10); }
    else x.rotate(Math.atan2(g.vy, g.vx));
    x.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h);
    x.restore();
    if (g.art === "eimer") { x.fillStyle = "rgba(0,0,0,.18)"; x.beginPath(); x.ellipse(g.zx + ox, g.zy + oy, 10, 4, 0, 0, Math.PI * 2); x.fill(); }
  }
  // Laser (leuchtend)
  for (const e of G.effekte) if (e.art === "laser") {
    const a = e.t / e.dauer;
    x.save(); x.translate(e.x + ox, e.y + oy); x.rotate(Math.atan2(e.ry, e.rx));
    x.globalCompositeOperation = "lighter";
    x.globalAlpha = a * 0.5; x.fillStyle = "#ff2030"; x.fillRect(-e.laenge, -e.breite, e.laenge * 2, e.breite * 2);
    x.globalAlpha = a; x.fillStyle = "#ff6070"; x.fillRect(-e.laenge, -e.breite / 3, e.laenge * 2, e.breite / 1.5);
    x.fillStyle = "#ffffff"; x.fillRect(-e.laenge, -1.2, e.laenge * 2, 2.4);
    x.restore(); x.globalAlpha = 1;
  }
  zeichnePartikel(x, ox, oy);

  // Schadenszahlen
  x.textAlign = "center";
  for (const t of G.texte) {
    const gross = t.gross ? 17 : 13;
    x.font = `900 ${gross}px Nunito, sans-serif`;
    x.globalAlpha = Math.min(1, t.t * 2.5);
    x.lineWidth = 3.5; x.strokeStyle = "rgba(20,10,10,.8)"; x.strokeText(t.text, t.x + ox, t.y + oy);
    x.fillStyle = t.farbe || "#ffffff"; x.fillText(t.text, t.x + ox, t.y + oy);
  }
  x.globalAlpha = 1;

  // Bildschirmränder, roter Blitz bei Treffer, grüner bei Level-Aufstieg
  x.drawImage(vignette(W, H), 0, 0, W, H);
  if (G.rotBlitz > 0) {
    const gr = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) / 2);
    gr.addColorStop(0, "rgba(227,6,19,0)"); gr.addColorStop(1, `rgba(227,6,19,${0.55 * G.rotBlitz / 0.35})`);
    x.fillStyle = gr; x.fillRect(0, 0, W, H);
  }
  if (G.lvlBlitz > 0) { x.fillStyle = `rgba(255,255,255,${G.lvlBlitz * 0.25})`; x.fillRect(0, 0, W, H); }
}

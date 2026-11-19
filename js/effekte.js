"use strict";
// =====================================================
//  EFFEKTE: Partikel (Funken, Staub, Teile, Ringe), Bildschirmwackeln, Deko in der Halle
//  und der lebendige Hintergrund im Menü.
// =====================================================

const MAX_PARTIKEL = 380;
const TEIL_FARBEN = { duebel: "#c9ccd1", wagen: "#9aa3ad", zange: "#e30613", farbe: "#3a8ee6", maeher: "#4caf50", saege: "#f28c28",
  stapler: "#f2c230", mischer: "#e30613", chef: "#3b4252" };

function partikel(p) { if (G && G.partikel.length < MAX_PARTIKEL) G.partikel.push(p); }

// Kleine Funken beim Treffer
function funken(x, y, n = 3, farbe = "#ffffff") {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 110 + Math.random() * 170;
    partikel({ art: "funke", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.22, dauer: 0.22, farbe });
  }
}
// Staubwolke + herumfliegende Teile, wenn ein Gegner besiegt wird
function zerplatzen(e) {
  const r = e.r;
  for (let i = 0; i < (e.boss ? 18 : 5); i++) {
    const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 50;
    partikel({ art: "staub", x: e.x + Math.cos(a) * r * 0.4, y: e.y + Math.sin(a) * r * 0.4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15,
      t: 0.55, dauer: 0.55, groesse: r * (0.35 + Math.random() * 0.3) * (e.boss ? 1.6 : 1) });
  }
  const farbe = e.farbe || TEIL_FARBEN[e.typ] || "#9aa3ad";
  for (let i = 0; i < (e.boss ? 14 : 3); i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = 140 + Math.random() * 160;
    partikel({ art: "teil", x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.7, dauer: 0.7, farbe, dreh: Math.random() * 6, schwer: true,
      boden: e.y + e.r * 0.6 + Math.random() * 10 });
  }
  if (G.effekte.length < 80) G.effekte.push({ art: "tod", typ: e.typ, v: e.v, x: e.x, y: e.y, links: e.x > G.x, t: 0.22, dauer: 0.22 });
}
function ringwelle(x, y, farbe, r, dauer = 0.5) {
  partikel({ art: "ring", x, y, vx: 0, vy: 0, t: dauer, dauer, farbe, groesse: r });
}
function glitzer(x, y, farbe = "#ffffff") {
  for (let i = 0; i < 3; i++) {
    const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60;
    partikel({ art: "glitzer", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0.4, dauer: 0.4, farbe });
  }
}
function wackeln(staerke) { G.wackeln = Math.max(G.wackeln || 0, staerke); }

function aktualisierePartikel(dt) {
  for (const p of G.partikel) {
    p.t -= dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.schwer) {
      p.vy += 900 * dt; p.dreh += dt * 12;
      if (p.y > p.boden && p.vy > 0) { p.y = p.boden; p.vy *= -0.35; p.vx *= 0.6; }
    } else { p.vx *= 1 - 4 * dt; p.vy *= 1 - 4 * dt; }
  }
  G.partikel = G.partikel.filter(p => p.t > 0);
  if (G.wackeln > 0) G.wackeln = Math.max(0, G.wackeln - dt * 30);
  // Staub unter den Füßen beim Laufen
  if (Math.hypot(eingabe.x, eingabe.y) > 0.3) {
    G.staubZeit = (G.staubZeit || 0) - dt;
    if (G.staubZeit <= 0) {
      G.staubZeit = 0.16;
      partikel({ art: "staub", x: G.x - G.richtung.x * 8 + (Math.random() - 0.5) * 8, y: G.y + 20, vx: -G.richtung.x * 20, vy: -10, t: 0.4, dauer: 0.4, groesse: 4 + Math.random() * 3 });
    }
  }
}

function zeichnePartikel(x, ox, oy) {
  for (const p of G.partikel) {
    const a = Math.max(0, p.t / p.dauer), px = p.x + ox, py = p.y + oy;
    if (p.art === "funke") {
      x.globalAlpha = a; x.strokeStyle = p.farbe; x.lineWidth = 2.2;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px - p.vx * 0.04, py - p.vy * 0.04); x.stroke();
    } else if (p.art === "staub") {
      x.globalAlpha = a * 0.45; x.fillStyle = "#9b9184";
      x.beginPath(); x.arc(px, py, p.groesse * (1.6 - a * 0.6), 0, Math.PI * 2); x.fill();
    } else if (p.art === "teil") {
      x.globalAlpha = Math.min(1, a * 2); x.fillStyle = p.farbe;
      x.save(); x.translate(px, py); x.rotate(p.dreh); x.fillRect(-3, -2, 6, 4); x.restore();
    } else if (p.art === "ring") {
      x.globalAlpha = a; x.strokeStyle = p.farbe; x.lineWidth = 3 + 5 * a;
      x.beginPath(); x.arc(px, py, p.groesse * (1.2 - a), 0, Math.PI * 2); x.stroke();
    } else if (p.art === "glitzer") {
      x.globalAlpha = a; x.fillStyle = p.farbe;
      x.save(); x.translate(px, py); x.rotate(p.t * 8); x.fillRect(-2.5, -0.8, 5, 1.6); x.fillRect(-0.8, -2.5, 1.6, 5); x.restore();
    }
  }
  x.globalAlpha = 1;
}

// ----- Deko: feste Plätze in einem großen Raster (immer gleich, egal wohin man läuft) -----
const DEKO_ZELLE = 420;
function zellZufall(cx, cy) {
  let h = (cx * 374761393 + cy * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}
function zeichneDeko(x, ox, oy, W, H, arten = DEKO_ARTEN) {
  const c0 = Math.floor((-ox - 100) / DEKO_ZELLE), c1 = Math.floor((-ox + W + 100) / DEKO_ZELLE);
  const r0 = Math.floor((-oy - 100) / DEKO_ZELLE), r1 = Math.floor((-oy + H + 100) / DEKO_ZELLE);
  for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) {
    const h = zellZufall(cx, cy);
    if (h % 100 > 62) continue;
    const s = dekoSprite(arten[(h >>> 7) % arten.length]);
    const px = cx * DEKO_ZELLE + 60 + ((h >>> 10) % 300) + ox, py = cy * DEKO_ZELLE + 60 + ((h >>> 19) % 300) + oy;
    x.fillStyle = "rgba(0,0,0,.2)"; x.beginPath(); x.ellipse(px, py + s.h / 2 - 3, s.w * 0.45, 7, 0, 0, Math.PI * 2); x.fill();
    x.drawImage(s.c, px - s.w / 2, py - s.h / 2, s.w, s.h);
  }
}
// Deckenlicht: Lichtkegel in festem Abstand
const LICHT_ABSTAND = 340;
function zeichneLicht(x, ox, oy, W, H) {
  const l = lichtSprite();
  x.globalCompositeOperation = "lighter";
  const sx = ((ox % LICHT_ABSTAND) + LICHT_ABSTAND) % LICHT_ABSTAND - LICHT_ABSTAND;
  const sy = ((oy % LICHT_ABSTAND) + LICHT_ABSTAND) % LICHT_ABSTAND - LICHT_ABSTAND;
  for (let px = sx; px < W + LICHT_ABSTAND; px += LICHT_ABSTAND) for (let py = sy; py < H + LICHT_ABSTAND; py += LICHT_ABSTAND) x.drawImage(l.c, px - 180, py - 180, 360, 360);
  x.globalCompositeOperation = "source-over";
}

// ----- Menü-Hintergrund: Halle mit Licht, und Stefan wird unten durchs Bild gejagt -----
function zeichneMenue(x, zeit) {
  const W = ansicht.w, H = ansicht.h, ox = -(zeit * 30), oy = -(zeit * 10);
  const karte = KARTEN[0], b = bodenKachel(karte.boden), bg = BODEN_GROESSE;
  const sx = ((ox % bg) + bg) % bg - bg, sy = ((oy % bg) + bg) % bg - bg;
  for (let px = sx; px < W; px += bg) for (let py = sy; py < H; py += bg) x.drawImage(b.c, px, py, bg, bg);
  zeichneLicht(x, ox, oy, W, H);
  zeichneDeko(x, ox, oy, W, H, karte.deko);
  x.fillStyle = "rgba(25,18,14,.42)"; x.fillRect(0, 0, W, H);
  // Verfolgungsjagd
  const weg = W + 520, kopf = (zeit * 140) % weg - 120, boden = H - 34;
  const fig = FIGUREN[0], st = figurSprite(fig, Math.floor(zeit * 8) % 2);
  const jagd = [["roller", 80, 0], ["klecks", 126, 1], ["klecks", 150, 2], ["eimer", 196, 1], ["spray", 248, 0], ["klecks", 288, 3], ["pinsel", 326, 2]];
  for (const [typ, abstand, v] of jagd.reverse()) {
    const s = gegnerSprite(typ, v), gx = kopf - abstand, hop = Math.abs(Math.sin(zeit * 10 + abstand)) * 4;
    x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.ellipse(gx, boden + 2, s.w * 0.36, 4, 0, 0, Math.PI * 2); x.fill();
    x.save(); x.translate(gx, boden - s.h / 2 - hop); x.scale(-1, 1); x.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h); x.restore();
  }
  x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.ellipse(kopf, boden + 2, 14, 4, 0, 0, Math.PI * 2); x.fill();
  x.drawImage(st.c, kopf - st.w / 2, boden - st.h - Math.abs(Math.sin(zeit * 16)) * 3, st.w, st.h);
  x.drawImage(vignette(W, H), 0, 0, W, H);
}

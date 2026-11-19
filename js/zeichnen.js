"use strict";
// =====================================================
//  ZEICHNEN: alle Figuren, Gegner, Geschosse und der Boden – mit Code gemalt
//  und einmal in kleine Leinwände (Sprites) vorgezeichnet, damit das Spiel flüssig läuft.
// =====================================================

const SPRITE_SCHARF = 2;          // doppelt so fein vorzeichnen (scharf auf Handys)
const LINIE = "#2a1d14";          // Umrisse
const spriteSpeicher = new Map();

// Vorgezeichnetes Bild holen (oder einmal malen). w/h in Spiel-Pixeln.
function sprite(key, w, h, malen) {
  let s = spriteSpeicher.get(key);
  if (s) return s;
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * SPRITE_SCHARF); c.height = Math.ceil(h * SPRITE_SCHARF);
  const x = c.getContext("2d");
  x.scale(SPRITE_SCHARF, SPRITE_SCHARF);
  x.lineJoin = "round"; x.lineCap = "round";
  malen(x, w, h);
  s = { c, w, h };
  spriteSpeicher.set(key, s);
  return s;
}

// Weiße Silhouette (Treffer-Blitz)
function weissSprite(key, s) {
  return sprite(key + "#weiss", s.w, s.h, x => {
    x.drawImage(s.c, 0, 0, s.w, s.h);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, s.w, s.h);
  });
}

// ----- kleine Malhilfen -----
function rundRechteck(x, px, py, w, h, r) {
  x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
}
function fuellen(x, farbe, umriss = 2) { x.fillStyle = farbe; x.fill(); if (umriss) { x.lineWidth = umriss; x.strokeStyle = LINIE; x.stroke(); } }
function kreis(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); }
// Böse Augen
function boeseAugen(x, cx, cy, abstand = 7, g = 3.6) {
  for (const s of [-1, 1]) {
    kreis(x, cx + s * abstand, cy, g); fuellen(x, "#ffffff", 1.4);
    kreis(x, cx + s * abstand - s * 0.6, cy + 0.8, g * 0.48); x.fillStyle = LINIE; x.fill();
    x.beginPath(); x.moveTo(cx + s * (abstand + g + 0.5), cy - g - 1.2); x.lineTo(cx + s * (abstand - g + 0.5), cy - g + 1.4);
    x.lineWidth = 2; x.strokeStyle = LINIE; x.stroke();
  }
}

// ----- Spielfigur -----
function figurSprite(fig, schritt) {
  const f = fig.farbe;
  return sprite(`figur-${fig.id}-${schritt}`, 40, 50, x => {
    const b = schritt ? 2 : -2;   // Beine im Wechsel
    // Beine
    rundRechteck(x, 13, 33 + Math.max(0, -b), 6, 12 - Math.abs(b) / 2, 2); fuellen(x, f.hose);
    rundRechteck(x, 21, 33 + Math.max(0, b), 6, 12 - Math.abs(b) / 2, 2); fuellen(x, f.hose);
    rundRechteck(x, 11, 43 + Math.max(0, -b) - Math.abs(b) / 2, 9, 5, 2); fuellen(x, "#3b2a20");
    rundRechteck(x, 20, 43 + Math.max(0, b) - Math.abs(b) / 2, 9, 5, 2); fuellen(x, "#3b2a20");
    // Arme
    rundRechteck(x, 6, 21, 6, 13, 3); fuellen(x, "#8f9aa6");
    rundRechteck(x, 28, 21, 6, 13, 3); fuellen(x, "#8f9aa6");
    kreis(x, 9, 35, 3); fuellen(x, f.haut, 1.4);
    kreis(x, 31, 35, 3); fuellen(x, f.haut, 1.4);
    // Körper mit Schürze
    rundRechteck(x, 11, 19, 18, 17, 5); fuellen(x, "#8f9aa6");
    rundRechteck(x, 12, 22, 16, 15, 4); fuellen(x, f.schuerze);
    rundRechteck(x, 14.5, 25, 11, 6, 2); fuellen(x, "#ffffff", 1.2);   // tuum-Abzeichen
    x.fillStyle = "#e30613"; x.font = "900 4.6px Nunito, sans-serif"; x.textAlign = "center"; x.fillText("tuum", 20, 29.6); x.textAlign = "left";
    // Kopf
    kreis(x, 20, 12, 9.5); fuellen(x, f.haut);
    x.beginPath(); x.arc(20, 11, 9.5, Math.PI * 1.05, Math.PI * 1.95); x.lineTo(27, 7); fuellen(x, f.haar, 0);
    // Mütze mit Schirm
    x.beginPath(); x.arc(20, 9, 9.6, Math.PI, 0); x.closePath(); fuellen(x, f.muetze);
    rundRechteck(x, 18, 7, 15, 3.6, 1.8); fuellen(x, f.muetze);
    // Gesicht
    kreis(x, 17, 13, 1.4); x.fillStyle = LINIE; x.fill();
    kreis(x, 23.5, 13, 1.4); x.fill();
    x.beginPath(); x.arc(20.5, 15.5, 3, 0.2, Math.PI - 0.2); x.lineWidth = 1.4; x.strokeStyle = LINIE; x.stroke();
  });
}

// ----- Gegner -----
const GEGNER_MALEN = {
  duebel: [22, 26, x => {
    rundRechteck(x, 6, 2, 10, 20, 4); fuellen(x, "#c9ccd1");
    for (let y = 6; y < 20; y += 4) { x.beginPath(); x.moveTo(6, y); x.lineTo(16, y + 1.5); x.lineWidth = 1.2; x.strokeStyle = "#7b8088"; x.stroke(); }
    rundRechteck(x, 4, 19, 14, 5, 2); fuellen(x, "#f2c230");
    boeseAugen(x, 11, 9, 3.2, 2.4);
  }],
  wagen: [38, 34, x => {
    x.beginPath(); x.moveTo(4, 6); x.lineTo(32, 6); x.lineTo(28, 24); x.lineTo(8, 24); x.closePath(); fuellen(x, "rgba(190,200,210,.45)");
    x.lineWidth = 1.2; x.strokeStyle = "#7d8790";
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(4 + i * 4.7, 6); x.lineTo(8 + i * 3.4, 24); x.stroke(); }
    for (const y of [12, 18]) { x.beginPath(); x.moveTo(5.5 + (y - 6) * 0.22, y); x.lineTo(30.5 - (y - 6) * 0.22, y); x.stroke(); }
    x.beginPath(); x.moveTo(32, 6); x.lineTo(36, 2); x.lineWidth = 3; x.strokeStyle = "#d9442b"; x.stroke();
    for (const wx of [10, 26]) { kreis(x, wx, 29, 3.6); fuellen(x, "#2f3338"); }
    boeseAugen(x, 18, 14, 6, 3.6);
  }],
  zange: [34, 30, x => {
    x.save(); x.translate(17, 15); x.rotate(-0.5);
    rundRechteck(x, -3, -2, 18, 6, 3); fuellen(x, "#d9442b");
    rundRechteck(x, -3, 4, 18, 6, 3); fuellen(x, "#d9442b");
    rundRechteck(x, -16, -6, 16, 14, 4); fuellen(x, "#9aa3ad");
    x.restore();
    boeseAugen(x, 11, 13, 4.2, 3);
  }],
  farbe: [34, 36, x => {
    x.beginPath(); x.arc(17, 8, 12, Math.PI, 0); x.lineWidth = 2; x.strokeStyle = "#555"; x.stroke();
    rundRechteck(x, 5, 8, 24, 25, 4); fuellen(x, "#f4f4f4");
    rundRechteck(x, 5, 8, 24, 7, 3); fuellen(x, "#3a8ee6");
    x.beginPath(); x.moveTo(9, 14); x.quadraticCurveTo(10, 22, 12, 14); x.moveTo(20, 14); x.quadraticCurveTo(21.5, 25, 23, 14);
    x.fillStyle = "#3a8ee6"; x.fill();
    boeseAugen(x, 17, 23, 5, 3.4);
  }],
  maeher: [40, 34, x => {
    rundRechteck(x, 4, 10, 32, 18, 6); fuellen(x, "#4caf50");
    rundRechteck(x, 10, 6, 20, 8, 3); fuellen(x, "#388e3c");
    x.beginPath(); x.moveTo(32, 12); x.lineTo(38, 2); x.lineWidth = 3; x.strokeStyle = "#555"; x.stroke();
    for (const wx of [9, 31]) { kreis(x, wx, 28, 4.5); fuellen(x, "#2f3338"); }
    x.fillStyle = "#7fd36b"; for (const gx of [2, 7, 33]) { x.fillRect(gx, 30, 2, 4); }
    boeseAugen(x, 20, 19, 6, 3.6);
  }],
  saege: [44, 28, x => {
    rundRechteck(x, 20, 9, 22, 9, 4); fuellen(x, "#b8c0c8");
    x.fillStyle = LINIE; for (let tx = 22; tx < 42; tx += 4) { x.beginPath(); x.moveTo(tx, 9); x.lineTo(tx + 2, 6); x.lineTo(tx + 4, 9); x.fill(); }
    rundRechteck(x, 2, 4, 22, 20, 6); fuellen(x, "#f28c28");
    rundRechteck(x, 6, 1, 12, 5, 2); fuellen(x, "#3b2a20");
    boeseAugen(x, 13, 14, 4.6, 3.4);
  }],
  stapler: [96, 84, x => {
    for (const fy of [56, 70]) { rundRechteck(x, 2, fy, 30, 5, 2); fuellen(x, "#7b8088"); }
    rundRechteck(x, 26, 14, 6, 62, 2); fuellen(x, "#5b6066");
    rundRechteck(x, 30, 34, 60, 40, 8); fuellen(x, "#f2c230");
    x.beginPath(); x.moveTo(42, 34); x.lineTo(46, 6); x.lineTo(84, 6); x.lineTo(88, 34); x.lineWidth = 4; x.strokeStyle = LINIE; x.stroke();
    rundRechteck(x, 44, 4, 42, 6, 2); fuellen(x, "#3b3f45");
    for (const wx of [44, 78]) { kreis(x, wx, 74, 9); fuellen(x, "#2f3338"); kreis(x, wx, 74, 3.5); fuellen(x, "#9aa3ad", 0); }
    rundRechteck(x, 50, 40, 32, 12, 3); fuellen(x, "#1f2328");
    boeseAugen(x, 66, 46, 9, 4.6);
    x.fillStyle = LINIE; x.font = "bold 9px sans-serif"; x.fillText("WARN", 54, 66);
  }],
  mischer: [104, 82, x => {
    rundRechteck(x, 4, 36, 92, 30, 6); fuellen(x, "#d9442b");
    x.save(); x.translate(44, 30); x.rotate(-0.25);
    x.beginPath(); x.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2); fuellen(x, "#c9ccd1");
    x.clip(); x.fillStyle = "#f28c28"; for (let i = -40; i < 40; i += 14) { x.save(); x.rotate(0.6); x.fillRect(i, -40, 6, 80); x.restore(); }
    x.restore();
    x.beginPath(); x.ellipse(44, 30, 34, 22, -0.25, 0, Math.PI * 2); x.lineWidth = 2.4; x.strokeStyle = LINIE; x.stroke();
    rundRechteck(x, 72, 18, 26, 34, 6); fuellen(x, "#f2f2f2");
    rundRechteck(x, 78, 22, 16, 12, 3); fuellen(x, "#5aa9e6");
    for (const wx of [20, 50, 82]) { kreis(x, wx, 68, 9); fuellen(x, "#2f3338"); }
    boeseAugen(x, 86, 42, 6, 3.6);
  }],
  chef: [60, 80, x => {
    for (const lx of [22, 32]) { rundRechteck(x, lx, 54, 8, 20, 3); fuellen(x, "#2b2f3a"); }
    for (const lx of [19, 31]) { rundRechteck(x, lx, 70, 11, 7, 3); fuellen(x, "#111"); }
    rundRechteck(x, 14, 28, 32, 30, 8); fuellen(x, "#3b4252");
    x.beginPath(); x.moveTo(26, 29); x.lineTo(30, 40); x.lineTo(34, 29); fuellen(x, "#ffffff", 1.2);
    x.beginPath(); x.moveTo(30, 31); x.lineTo(27.5, 44); x.lineTo(30, 48); x.lineTo(32.5, 44); x.closePath(); fuellen(x, "#d9442b", 1.2);
    rundRechteck(x, 35, 36, 9, 5, 1.5); fuellen(x, "#ffffff", 1);
    rundRechteck(x, 2, 34, 13, 17, 2); fuellen(x, "#c98b55");      // Klemmbrett
    rundRechteck(x, 4, 37, 9, 12, 1); fuellen(x, "#ffffff", 1);
    kreis(x, 30, 16, 14); fuellen(x, "#f2c9a0");
    x.beginPath(); x.arc(30, 14, 14, Math.PI * 1.1, Math.PI * 1.9); x.lineTo(38, 8); fuellen(x, "#9aa3ad", 0);
    boeseAugen(x, 30, 16, 5.5, 3.6);
    x.beginPath(); x.moveTo(25, 24); x.quadraticCurveTo(30, 21, 35, 24); x.lineWidth = 2; x.strokeStyle = LINIE; x.stroke();
  }],
};
function gegnerSprite(typ) { const [w, h, m] = GEGNER_MALEN[typ]; return sprite("gegner-" + typ, w, h, m); }

// ----- Geschosse, Funde -----
const KLEIN_MALEN = {
  schraube: [18, 8, x => { rundRechteck(x, 1, 2, 12, 4, 2); fuellen(x, "#c9ccd1", 1.2); x.beginPath(); x.moveTo(13, 1); x.lineTo(17, 4); x.lineTo(13, 7); fuellen(x, "#9aa3ad", 1.2); rundRechteck(x, 0, 0.5, 3, 7, 1); fuellen(x, "#8f9aa6", 1.2); }],
  nagel: [16, 6, x => { rundRechteck(x, 2, 2, 12, 2, 1); fuellen(x, "#d7dbe0", 1); x.beginPath(); x.moveTo(14, 1.5); x.lineTo(16, 3); x.lineTo(14, 4.5); x.fill(); rundRechteck(x, 0.5, 0.5, 2.5, 5, 1); fuellen(x, "#9aa3ad", 1); }],
  hammer: [30, 30, x => { rundRechteck(x, 13, 8, 5, 21, 2); fuellen(x, "#c98b55"); rundRechteck(x, 5, 3, 21, 9, 3); fuellen(x, "#7b8088"); }],
  saegeblatt: [34, 34, x => {
    x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = i % 2 ? 13 : 16.5; x.lineTo(17 + Math.cos(a) * r, 17 + Math.sin(a) * r); } x.closePath(); fuellen(x, "#d7dbe0");
    kreis(x, 17, 17, 4); fuellen(x, "#d9442b");
  }],
  eimer: [22, 22, x => { rundRechteck(x, 4, 5, 14, 15, 3); fuellen(x, "#f4f4f4"); rundRechteck(x, 4, 5, 14, 5, 2); fuellen(x, "#3a8ee6"); }],
  xp1: [14, 14, x => { kreis(x, 7, 7, 5); fuellen(x, "#d7dbe0", 1.6); x.beginPath(); x.moveTo(4, 7); x.lineTo(10, 7); x.moveTo(7, 4); x.lineTo(7, 10); x.lineWidth = 1.4; x.strokeStyle = "#555"; x.stroke(); }],
  xp2: [16, 16, x => { kreis(x, 8, 8, 6); fuellen(x, "#5aa9e6", 1.6); x.beginPath(); x.moveTo(5, 8); x.lineTo(11, 8); x.moveTo(8, 5); x.lineTo(8, 11); x.lineWidth = 1.5; x.strokeStyle = "#1d3a5c"; x.stroke(); }],
  xp3: [18, 18, x => { kreis(x, 9, 9, 7); fuellen(x, "#f2c230", 1.6); x.beginPath(); x.moveTo(5.5, 9); x.lineTo(12.5, 9); x.moveTo(9, 5.5); x.lineTo(9, 12.5); x.lineWidth = 1.6; x.strokeStyle = "#6b4a00"; x.stroke(); }],
  euro: [18, 18, x => { kreis(x, 9, 9, 7.5); fuellen(x, "#f2c230", 1.6); x.fillStyle = "#6b4a00"; x.font = "bold 10px sans-serif"; x.textAlign = "center"; x.fillText("€", 9, 12.5); }],
  wurst: [30, 16, x => { rundRechteck(x, 1, 5, 28, 9, 4.5); fuellen(x, "#e8c48a"); rundRechteck(x, 4, 3, 22, 8, 4); fuellen(x, "#b5562b"); x.beginPath(); x.moveTo(7, 6); x.quadraticCurveTo(11, 3, 15, 6); x.quadraticCurveTo(19, 9, 23, 6); x.lineWidth = 1.4; x.strokeStyle = "#f2c230"; x.stroke(); }],
  kiste: [34, 28, x => { rundRechteck(x, 2, 8, 30, 18, 3); fuellen(x, "#d9442b"); rundRechteck(x, 2, 8, 30, 6, 2); fuellen(x, "#b8321f"); rundRechteck(x, 11, 2, 12, 8, 3); x.lineWidth = 2.4; x.strokeStyle = LINIE; x.stroke(); rundRechteck(x, 14, 12, 6, 5, 1); fuellen(x, "#d7dbe0", 1.4); }],
};
function kleinSprite(k) { const [w, h, m] = KLEIN_MALEN[k]; return sprite("klein-" + k, w, h, m); }

// ----- Boden: Baumarkt-Halle (eine große Kachel, die sich wiederholt) -----
const BODEN_GROESSE = 640;
function bodenKachel() {
  return sprite("boden", BODEN_GROESSE, BODEN_GROESSE, x => {
    x.fillStyle = "#a59f93"; x.fillRect(0, 0, BODEN_GROESSE, BODEN_GROESSE);
    let z = 7; const zufall = () => (z = (z * 16807) % 2147483647) / 2147483647;
    // Betonplatten
    x.strokeStyle = "rgba(90,84,76,.25)"; x.lineWidth = 2;
    for (let i = 0; i <= BODEN_GROESSE; i += 160) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, BODEN_GROESSE); x.moveTo(0, i); x.lineTo(BODEN_GROESSE, i); x.stroke(); }
    // Flecken und Kratzer
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(80,70,60,${0.03 + zufall() * 0.04})`; x.beginPath(); x.ellipse(zufall() * BODEN_GROESSE, zufall() * BODEN_GROESSE, 8 + zufall() * 30, 4 + zufall() * 12, zufall() * 3, 0, Math.PI * 2); x.fill(); }
    // Fahrspur wie ein Zollstock: grün mit weißen Strichen
    x.fillStyle = "#3aa935"; x.fillRect(0, 306, BODEN_GROESSE, 26);
    x.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < BODEN_GROESSE; i += 8) x.fillRect(i, 306, 1.5, i % 40 === 0 ? 12 : 6);
    for (let i = 0; i < BODEN_GROESSE; i += 128) x.fillRect(i, 306, 2, 26);
    // tuum-Logo auf dem Boden
    x.save(); x.globalAlpha = 0.3; x.fillStyle = "#e30613"; rundRechteck(x, 380, 380, 150, 64, 14); x.fill();
    x.globalAlpha = 0.45; x.fillStyle = "#ffffff"; x.font = "900 44px Nunito, sans-serif"; x.textAlign = "center"; x.fillText("tuum", 455, 426); x.restore();
    // Pfeile auf dem Boden
    x.fillStyle = "rgba(255,255,255,.55)";
    for (const [px, py, r] of [[120, 120, 0], [480, 520, Math.PI]]) {
      x.save(); x.translate(px, py); x.rotate(r); x.beginPath(); x.moveTo(-20, -6); x.lineTo(6, -6); x.lineTo(6, -14); x.lineTo(22, 0); x.lineTo(6, 14); x.lineTo(6, 6); x.lineTo(-20, 6); x.closePath(); x.fill(); x.restore();
    }
    // Preisschild-Aufkleber und Paletten
    for (const [px, py] of [[420, 90], [70, 470]]) {
      x.fillStyle = "#a8783f"; x.fillRect(px, py, 70, 50); x.fillStyle = "#8a5f2c";
      for (let i = 0; i < 4; i++) x.fillRect(px, py + 4 + i * 12, 70, 4);
    }
    x.textAlign = "left";
    x.fillStyle = "#3aa935"; rundRechteck(x, 40, 200, 66, 24, 5); x.fill();
    x.fillStyle = "#ffffff"; x.font = "900 12px Nunito, sans-serif"; x.fillText("GARTEN →", 46, 216);
  });
}

// ----- Deko in der Halle (liegt am Boden, Gegner laufen darüber) -----
const DEKO_MALEN = {
  palette: [86, 70, x => {
    rundRechteck(x, 3, 46, 80, 20, 3); fuellen(x, "#b98a52"); x.fillStyle = "#8a5f2c"; for (const px of [8, 38, 68]) x.fillRect(px, 58, 10, 8);
    rundRechteck(x, 8, 16, 36, 32, 3); fuellen(x, "#c9a06b"); rundRechteck(x, 42, 22, 36, 26, 3); fuellen(x, "#d9b07a");
    rundRechteck(x, 22, 2, 34, 22, 3); fuellen(x, "#c9a06b");
    x.fillStyle = "#e30613"; x.fillRect(14, 26, 22, 5); x.fillStyle = "#3aa935"; x.fillRect(48, 30, 22, 5);
    x.strokeStyle = "rgba(42,29,20,.35)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(26, 16); x.lineTo(26, 48); x.moveTo(60, 22); x.lineTo(60, 48); x.moveTo(39, 2); x.lineTo(39, 24); x.stroke();
  }],
  farbstapel: [64, 62, x => {
    const eimer = (px, py, farbe) => { rundRechteck(x, px, py, 22, 22, 4); fuellen(x, "#f4f4f4"); rundRechteck(x, px, py, 22, 7, 3); fuellen(x, farbe); };
    eimer(4, 36, "#e30613"); eimer(24, 36, "#3aa935"); eimer(44, 36, "#3a8ee6"); eimer(14, 16, "#3aa935"); eimer(34, 16, "#e30613");
    rundRechteck(x, 24, 0, 18, 18, 4); fuellen(x, "#f4f4f4"); rundRechteck(x, 24, 0, 18, 6, 3); fuellen(x, "#8f5bd6");
  }],
  pflanze: [52, 64, x => {
    x.fillStyle = "#2f8f2c";
    for (const [a, l] of [[-2.2, 26], [-1.6, 30], [-1.1, 28], [-0.6, 24], [-2.6, 20], [-0.2, 20]]) {
      x.save(); x.translate(26, 36); x.rotate(a); x.beginPath(); x.ellipse(l / 2, 0, l / 2, 6, 0, 0, Math.PI * 2); x.fill(); x.lineWidth = 1.5; x.strokeStyle = "#1f6b1c"; x.stroke(); x.restore();
    }
    x.beginPath(); x.moveTo(10, 36); x.lineTo(42, 36); x.lineTo(38, 62); x.lineTo(14, 62); x.closePath(); fuellen(x, "#c96a3a");
    rundRechteck(x, 8, 33, 36, 7, 2); fuellen(x, "#b3582c");
  }],
  huetchen: [30, 40, x => {
    rundRechteck(x, 1, 33, 28, 6, 2); fuellen(x, "#d7dbe0");
    x.beginPath(); x.moveTo(15, 1); x.lineTo(25, 34); x.lineTo(5, 34); x.closePath(); fuellen(x, "#e30613");
    x.fillStyle = "#ffffff"; x.beginPath(); x.moveTo(11.5, 13); x.lineTo(18.5, 13); x.lineTo(20.4, 19); x.lineTo(9.6, 19); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(8.4, 24); x.lineTo(21.6, 24); x.lineTo(23, 29); x.lineTo(7, 29); x.closePath(); x.fill();
  }],
  aufsteller: [56, 66, x => {
    x.strokeStyle = LINIE; x.lineWidth = 3; x.beginPath(); x.moveTo(14, 64); x.lineTo(20, 40); x.moveTo(42, 64); x.lineTo(36, 40); x.stroke();
    rundRechteck(x, 3, 2, 50, 42, 6); fuellen(x, "#e30613");
    rundRechteck(x, 8, 7, 40, 15, 4); fuellen(x, "#ffffff", 0);
    x.fillStyle = "#e30613"; x.font = "900 13px Nunito, sans-serif"; x.textAlign = "center"; x.fillText("tuum", 28, 19);
    x.fillStyle = "#ffffff"; x.font = "900 10px Nunito, sans-serif"; x.fillText("ANGEBOT", 28, 35); x.textAlign = "left";
  }],
  korb: [40, 34, x => {
    x.beginPath(); x.moveTo(3, 10); x.lineTo(37, 10); x.lineTo(33, 31); x.lineTo(7, 31); x.closePath(); fuellen(x, "#e30613");
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 1.5;
    for (let i = 1; i < 6; i++) { x.beginPath(); x.moveTo(3 + i * 5.7, 12); x.lineTo(7 + i * 4.4, 29); x.stroke(); }
    x.beginPath(); x.arc(20, 10, 13, Math.PI, 0); x.lineWidth = 3; x.strokeStyle = LINIE; x.stroke();
    rundRechteck(x, 10, 4, 9, 9, 2); fuellen(x, "#3aa935", 1.4);
  }],
};
function dekoSprite(k) { const [w, h, m] = DEKO_MALEN[k]; return sprite("deko-" + k, w, h, m); }
const DEKO_ARTEN = Object.keys(DEKO_MALEN);

// Weicher Lichtkegel einer Hallenlampe
function lichtSprite() {
  return sprite("licht", 360, 360, x => {
    const g = x.createRadialGradient(180, 180, 0, 180, 180, 180);
    g.addColorStop(0, "rgba(255,246,225,.17)"); g.addColorStop(0.5, "rgba(255,246,225,.06)"); g.addColorStop(1, "rgba(255,250,235,0)");
    x.fillStyle = g; x.fillRect(0, 0, 360, 360);
  });
}
// Dunkle Ränder (wird für jede Bildschirmgröße einmal gemalt)
let vignetteSpeicher = null;
function vignette(w, h) {
  if (vignetteSpeicher && vignetteSpeicher.w === w && vignetteSpeicher.h === h) return vignetteSpeicher.c;
  const c = document.createElement("canvas"); c.width = Math.ceil(w / 2); c.height = Math.ceil(h / 2);
  const x = c.getContext("2d"), r = Math.hypot(c.width, c.height) / 2;
  const g = x.createRadialGradient(c.width / 2, c.height / 2, r * 0.45, c.width / 2, c.height / 2, r);
  g.addColorStop(0, "rgba(20,14,10,0)"); g.addColorStop(1, "rgba(20,14,10,.55)");
  x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
  vignetteSpeicher = { w, h, c };
  return c;
}

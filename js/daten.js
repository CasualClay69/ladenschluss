"use strict";
// =====================================================
//  DATEN: Figuren, Waffen, Ausrüstung, Gegner, Wellen und Werkstatt.
//  Hier stellt man das Balancing ein – die Spiellogik steht in spiel.js.
// =====================================================

const SPIEL_DAUER = 15 * 60;   // Sekunden bis Ladenschluss = gewonnen

// ----- Spielbare Figuren -----
const FIGUREN = [
  { id: "stefan", name: "Stefan", text: "Kennt jeden Gang im Baumarkt. Startet mit dem Akkuschrauber.",
    start: "akkuschrauber", farbe: { schuerze: "#e30613", hose: "#3a4a5c", haut: "#f2c9a0", bart: "#4a2e1c", brille: "#4a2e1c" },
    bonus: {} },
  { id: "bald1", name: "???", text: "Kommt bald …", gesperrt: true },
  { id: "bald2", name: "???", text: "Kommt bald …", gesperrt: true },
];

// ----- Waffen (max. Stufe 8). "stufen" = was jede weitere Stufe dazugibt -----
// Werte: schaden, cd (Abklingzeit in s), anzahl, durchschlag, tempo, bereich, dauer
const WAFFEN = {
  akkuschrauber: { name: "Akkuschrauber", icon: "🪛", text: "Schießt Schrauben auf den nächsten Gegner.",
    basis: { schaden: 12, cd: 0.8, anzahl: 1, durchschlag: 1, tempo: 460 },
    stufen: [{ anzahl: 1 }, { schaden: 5 }, { cd: -0.15 }, { durchschlag: 1 }, { anzahl: 1 }, { schaden: 6 }, { anzahl: 1, durchschlag: 1 }] },
  hammer: { name: "Hammer", icon: "🔨", text: "Fliegt wie ein Bumerang und kommt zurück.",
    basis: { schaden: 22, cd: 2.2, anzahl: 1, tempo: 420, bereich: 1 },
    stufen: [{ schaden: 8 }, { anzahl: 1 }, { cd: -0.3 }, { bereich: 0.25 }, { schaden: 10 }, { anzahl: 1 }, { schaden: 12, bereich: 0.25 }] },
  kreissaege: { name: "Kreissäge", icon: "⚙️", text: "Sägeblätter kreisen um dich herum.",
    basis: { schaden: 18, cd: 3.4, anzahl: 1, dauer: 3.5, bereich: 1, tempo: 3.2 },
    stufen: [{ anzahl: 1 }, { schaden: 5 }, { dauer: 0.8 }, { anzahl: 1 }, { bereich: 0.2, tempo: 0.6 }, { schaden: 7 }, { anzahl: 1, dauer: 1 }] },
  nagelpistole: { name: "Nagelpistole", icon: "📌", text: "Ein Fächer aus Nägeln in Laufrichtung.",
    basis: { schaden: 8, cd: 0.85, anzahl: 3, durchschlag: 1, tempo: 540 },
    stufen: [{ anzahl: 1 }, { schaden: 3 }, { durchschlag: 1 }, { anzahl: 2 }, { cd: -0.15 }, { schaden: 4 }, { anzahl: 2, durchschlag: 1 }] },
  bauschaum: { name: "Bauschaum", icon: "🫧", text: "Eine klebrige Schaumwolke schadet allen in deiner Nähe.",
    basis: { schaden: 8, cd: 0.5, bereich: 1 },
    stufen: [{ bereich: 0.2 }, { schaden: 4 }, { bereich: 0.15 }, { schaden: 5 }, { cd: -0.1 }, { bereich: 0.2 }, { schaden: 7 }] },
  wasserwaage: { name: "Laser-Wasserwaage", icon: "📏", text: "Ein Laserstrahl quer über den Bildschirm.",
    basis: { schaden: 26, cd: 3.2, bereich: 1, anzahl: 1 },
    stufen: [{ schaden: 10 }, { cd: -0.4 }, { anzahl: 1 }, { bereich: 0.4 }, { schaden: 14 }, { cd: -0.4 }, { schaden: 20, bereich: 0.4 }] },
  farbeimer: { name: "Farbeimer", icon: "🪣", text: "Wirft Farbe – die Pfütze schadet allen, die hindurchlaufen.",
    basis: { schaden: 8, cd: 3.4, anzahl: 1, dauer: 3, bereich: 1 },
    stufen: [{ anzahl: 1 }, { schaden: 3 }, { bereich: 0.25 }, { dauer: 1 }, { anzahl: 1 }, { schaden: 4 }, { anzahl: 1, bereich: 0.25 }] },
};
const MAX_WAFFEN = 6;
const MAX_AUSRUESTUNG = 6;

// ----- Ausrüstung (passiv, max. Stufe 5) -----
const AUSRUESTUNG = {
  handschuhe:  { name: "Arbeitshandschuhe", icon: "🧤", text: "+10 % Schaden", wert: { schaden: 0.1 } },
  schuhe:      { name: "Sicherheitsschuhe", icon: "🥾", text: "+8 % Lauftempo", wert: { tempo: 0.08 } },
  kaffee:      { name: "Thermoskanne Kaffee", icon: "☕", text: "−7 % Abklingzeit", wert: { cd: -0.07 } },
  helm:        { name: "Bauhelm", icon: "⛑️", text: "+20 max. Leben und +1 Rüstung", wert: { maxLeben: 20, ruestung: 1 } },
  magnet:      { name: "Magnetleiste", icon: "🧲", text: "+30 % Sammelradius", wert: { magnet: 0.3 } },
  guertel:     { name: "Werkzeuggürtel", icon: "🧰", text: "+10 % Wirkungsbereich", wert: { bereich: 0.1 } },
  kundenkarte: { name: "Kundenkarte", icon: "💳", text: "+12 % Erfahrung", wert: { xp: 0.12 } },
  doppelpack:  { name: "Doppelpack", icon: "➕", text: "+1 Geschoss für alle Waffen", wert: { anzahl: 1 }, max: 2 },
};

// ----- Gegner -----
const GEGNER = {
  duebel:   { name: "Dübel",            r: 9,  leben: 7,    tempo: 72,  schaden: 5,  xp: 1 },
  wagen:    { name: "Einkaufswagen",    r: 15, leben: 20,   tempo: 88,  schaden: 8,  xp: 2 },
  zange:    { name: "Rohrzange",        r: 13, leben: 28,   tempo: 100, schaden: 9,  xp: 3 },
  farbe:    { name: "Farbeimer",        r: 16, leben: 55,   tempo: 50,  schaden: 12, xp: 4 },
  maeher:   { name: "Rasenmäher",       r: 17, leben: 40,   tempo: 125, schaden: 11, xp: 4 },
  saege:    { name: "Wilde Kettensäge", r: 17, leben: 95,   tempo: 92,  schaden: 18, xp: 7 },
  // Bosse
  stapler:  { name: "Amok-Gabelstapler", r: 40, leben: 1800, tempo: 78, schaden: 25, xp: 60,  boss: true },
  mischer:  { name: "Betonmischer",      r: 44, leben: 5000, tempo: 62, schaden: 32, xp: 120, boss: true },
  chef:     { name: "Der Filialleiter",  r: 38, leben: 12000, tempo: 92, schaden: 40, xp: 250, boss: true },

  // ----- Farben-Abteilung (gleiche Werte wie die Rollen oben, nur anderes Aussehen) -----
  klecks:   { name: "Farbklecks",   r: 9,  leben: 7,  tempo: 72,  schaden: 5,  xp: 1, varianten: 4 },
  pinsel:   { name: "Pinsel",       r: 14, leben: 20, tempo: 88,  schaden: 8,  xp: 2, varianten: 3 },
  roller:   { name: "Farbroller",   r: 14, leben: 28, tempo: 100, schaden: 9,  xp: 3, varianten: 3 },
  eimer:    { name: "Farbeimer",    r: 16, leben: 55, tempo: 50,  schaden: 12, xp: 4, varianten: 3 },
  spray:    { name: "Sprühdose",    r: 13, leben: 40, tempo: 125, schaden: 11, xp: 4, varianten: 3 },
  tapete:   { name: "Tapetenrolle", r: 18, leben: 95, tempo: 92,  schaden: 18, xp: 7, varianten: 2 },
  megaroller:   { name: "Mega-Farbroller",   r: 40, leben: 1800,  tempo: 82, schaden: 25, xp: 60,  boss: true },
  mischmaschine:{ name: "Farbmischmaschine", r: 44, leben: 5000,  tempo: 62, schaden: 32, xp: 120, boss: true },
  farbmeister:  { name: "Der Farbmeister",   r: 38, leben: 12000, tempo: 92, schaden: 40, xp: 250, boss: true },
};

// Farben für Farb-Gegner und Kleckse (bewusst ohne Gelb)
const FARBTOEPFE = ["#e30613", "#3aa935", "#2f7fd6", "#8f4bd6"];

// ----- Karten (Abteilungen). gegner: welcher Gegner welche Rolle spielt -----
const KARTEN = [
  { id: "farben", name: "Farben-Abteilung", icon: "🎨", text: "Pinsel, Roller und Farbkleckse – hier wird es bunt!",
    gegner: { klein: "klecks", basis: "pinsel", flink: "roller", zaeh: "eimer", schnell: "spray", schwer: "tapete" },
    bosse: [[5 * 60, "megaroller"], [10 * 60, "mischmaschine"], [14 * 60, "farbmeister"]],
    boden: "farben", deko: ["farbstapel", "farbwanne", "leiter", "farbfaecher", "aufsteller", "huetchen", "farbstapel"], flecken: true },
  { id: "garten", name: "Garten-Abteilung", icon: "🌱", text: "Kommt bald …", gesperrt: true },
  { id: "werkzeug", name: "Werkzeug-Abteilung", icon: "🔧", text: "Kommt bald …", gesperrt: true },
];

// ----- Wellen: pro Minute, welche Rollen kommen und wie viele pro Sekunde (die Karte sagt, welcher Gegner welche Rolle ist) -----
const WELLEN = [
  { typen: ["klein"], rate: 1.2 },
  { typen: ["klein", "klein", "basis"], rate: 1.7 },
  { typen: ["klein", "basis", "basis"], rate: 2.1 },
  { typen: ["basis", "flink", "klein"], rate: 2.5 },
  { typen: ["flink", "basis", "zaeh"], rate: 2.9 },
  { typen: ["klein", "klein", "klein", "flink"], rate: 4.6 },
  { typen: ["zaeh", "flink", "schnell"], rate: 3.5 },
  { typen: ["schnell", "basis", "zaeh"], rate: 4.0 },
  { typen: ["zaeh", "schnell", "flink"], rate: 4.6 },
  { typen: ["schwer", "flink", "schnell"], rate: 4.9 },
  { typen: ["schwer", "zaeh", "schnell"], rate: 5.4 },
  { typen: ["klein", "klein", "schwer", "schnell"], rate: 7.4 },
  { typen: ["schwer", "zaeh", "schnell", "flink"], rate: 6.4 },
  { typen: ["schwer", "schwer", "schnell"], rate: 7.0 },
  { typen: ["schwer", "schnell", "zaeh", "klein"], rate: 8.0 },
];
const MAX_GEGNER = 380;
const LEBEN_PRO_MINUTE = 0.14;   // Gegner werden pro Minute 14 % zäher

// ----- Erfahrung bis zum nächsten Level -----
const xpBis = lvl => Math.round(3 + lvl * 3.5 + Math.pow(lvl, 1.7) * 0.7);

// ----- Werkstatt: dauerhafte Verbesserungen für Euro -----
const WERKSTATT = {
  leben:   { name: "Gesunde Brotzeit", icon: "🥪", text: "+10 max. Leben", max: 5, preis: 60,  wert: { maxLeben: 10 } },
  schaden: { name: "Profi-Werkzeug",   icon: "💪", text: "+5 % Schaden",    max: 5, preis: 90,  wert: { schaden: 0.05 } },
  tempo:   { name: "Bequeme Schuhe",   icon: "👟", text: "+4 % Lauftempo",  max: 3, preis: 80,  wert: { tempo: 0.04 } },
  magnet:  { name: "Großer Magnet",    icon: "🧲", text: "+15 % Sammelradius", max: 3, preis: 60, wert: { magnet: 0.15 } },
  xp:      { name: "Treuepunkte",      icon: "⭐", text: "+5 % Erfahrung",  max: 5, preis: 100, wert: { xp: 0.05 } },
  ruestung:{ name: "Dicke Jacke",      icon: "🧥", text: "+1 Rüstung",      max: 2, preis: 220, wert: { ruestung: 1 } },
};
const werkstattPreis = (id, stufe) => Math.round(WERKSTATT[id].preis * Math.pow(1.6, stufe));

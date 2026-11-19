"use strict";
// =====================================================
//  UI: Bildschirme (Titel, Figur, Werkstatt, Level-Auswahl, Pause, Ende), Anzeige oben und die Spielschleife.
// =====================================================

const $ = id => document.getElementById(id);
const leinwand = $("leinwand");
const pinsel = leinwand.getContext("2d");
let gewaehlteFigur = "stefan";
let gewaehlteKarte = "farben";

const zeitText = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const zahl = n => Math.round(n).toLocaleString("de-DE");

// ----- Bildschirme -----
function zeigeSchirm(id) {
  for (const s of document.querySelectorAll(".schirm")) s.hidden = s.id !== id;
}
function zeigeOverlay(id, an) { $(id).hidden = !an; }

// ----- Leinwand an Fenstergröße anpassen -----
function groesseAnpassen() {
  ansicht.dpr = Math.min(2, window.devicePixelRatio || 1);
  ansicht.w = window.innerWidth; ansicht.h = window.innerHeight;
  leinwand.width = Math.round(ansicht.w * ansicht.dpr); leinwand.height = Math.round(ansicht.h * ansicht.dpr);
  leinwand.style.width = ansicht.w + "px"; leinwand.style.height = ansicht.h + "px";
}
window.addEventListener("resize", groesseAnpassen);

// ----- Titel -----
function zeigeTitel() {
  G = null;
  $("hud").hidden = true;
  if (window.updateWartet && typeof pruefeAufUpdate === "function") pruefeAufUpdate();
  $("titelEuro").textContent = zahl(SP.euro);
  $("titelRekord").textContent = SP.rekord.zeit ? `Rekord: ${zeitText(SP.rekord.zeit)} · ${zahl(SP.rekord.kills)} besiegt · Level ${SP.rekord.lvl}${SP.siege ? ` · ${SP.siege}× Feierabend erreicht 🏆` : ""}` : "Halte 15 Minuten durch – dann ist Ladenschluss!";
  $("tonKnopf").textContent = SP.ton ? "🔊 Ton an" : "🔇 Ton aus";
  zeigeSchirm("titel");
}

// ----- Figurenwahl -----
function zeigeFiguren() {
  const liste = $("figurenListe");
  liste.textContent = "";
  for (const f of FIGUREN) {
    const k = document.createElement("button");
    k.className = "figurKarte" + (f.gesperrt ? " gesperrt" : "") + (f.id === gewaehlteFigur ? " gewaehlt" : "");
    k.disabled = !!f.gesperrt;
    const bild = document.createElement("canvas");
    bild.width = 80; bild.height = 106; bild.className = "figurBild";
    if (!f.gesperrt) { const s = figurSprite(f, 0); bild.getContext("2d").drawImage(s.c, 0, 0, 80, 80 * s.h / s.w); }
    else { const c = bild.getContext("2d"); c.font = "54px sans-serif"; c.textAlign = "center"; c.fillText("🔒", 40, 68); }
    const start = f.start ? `<div class="klein">Startwaffe: ${WAFFEN[f.start].icon} ${WAFFEN[f.start].name}</div>` : "";
    k.innerHTML = `<b>${f.name}</b><div class="klein">${f.text}</div>${start}`;
    k.prepend(bild);
    k.addEventListener("click", () => { gewaehlteFigur = f.id; zeigeFiguren(); });
    liste.append(k);
  }
  zeigeSchirm("figuren");
}

// ----- Kartenwahl (Abteilungen) -----
function zeigeKarten() {
  const liste = $("kartenListe");
  liste.textContent = "";
  for (const k of KARTEN) {
    const b = document.createElement("button");
    b.className = "karteKarte" + (k.gesperrt ? " gesperrt" : "") + (k.id === gewaehlteKarte ? " gewaehlt" : "");
    b.disabled = !!k.gesperrt;
    const bild = document.createElement("canvas");
    bild.width = 220; bild.height = 110; bild.className = "karteBild";
    const c = bild.getContext("2d");
    if (k.gesperrt) {
      c.fillStyle = "#2e343b"; c.fillRect(0, 0, 220, 110);
      c.font = "48px sans-serif"; c.textAlign = "center"; c.globalAlpha = 0.5; c.fillText(k.icon, 110, 72);
      c.globalAlpha = 1; c.font = "30px sans-serif"; c.fillText("🔒", 180, 100);
    } else {
      const boden = bodenKachel(k.boden); c.drawImage(boden.c, 0, 0, boden.c.width, boden.c.height, -150, -260, 640, 640);
      const zeig = [[k.gegner.klein, 40, 70, 0], [k.gegner.basis, 78, 62, 2], [k.gegner.zaeh, 120, 66, 1], [k.gegner.flink, 165, 70, 0], [k.gegner.klein, 196, 82, 3]];
      for (const [typ, px, py, v] of zeig) { const s = gegnerSprite(typ, v); c.drawImage(s.c, px - s.w / 2, py - s.h / 2, s.w, s.h); }
    }
    const rekord = SP.kartenRekord && SP.kartenRekord[k.id] ? `<div class="klein">Rekord: ${zeitText(SP.kartenRekord[k.id])}</div>` : "";
    b.innerHTML = `<b>${k.icon} ${k.name}</b><div class="klein">${k.text}</div>${rekord}`;
    b.prepend(bild);
    b.addEventListener("click", () => { gewaehlteKarte = k.id; zeigeKarten(); });
    liste.append(b);
  }
  zeigeSchirm("karten");
}

// ----- Werkstatt -----
function zeigeWerkstatt() {
  $("werkstattEuro").textContent = zahl(SP.euro);
  const liste = $("werkstattListe");
  liste.textContent = "";
  for (const id in WERKSTATT) {
    const w = WERKSTATT[id], st = werkstattStufe(id), voll = st >= w.max, preis = werkstattPreis(id, st);
    const k = document.createElement("div");
    k.className = "werkKarte";
    k.innerHTML = `<span class="werkIcon">${w.icon}</span><div class="werkText"><b>${w.name}</b><div class="klein">${w.text}</div>
      <div class="punkte">${"●".repeat(st)}${"○".repeat(w.max - st)}</div></div>`;
    const b = document.createElement("button");
    b.className = "knopf klein-knopf";
    b.textContent = voll ? "✓ Voll" : `${zahl(preis)} €`;
    b.disabled = voll || SP.euro < preis;
    b.addEventListener("click", () => {
      if (SP.euro < preis || voll) return;
      SP.euro -= preis; SP.werkstatt[id] = st + 1; speichern(); ton.muenze(); zeigeWerkstatt();
    });
    k.append(b);
    liste.append(k);
  }
  zeigeSchirm("werkstatt");
}

// ----- Runde starten -----
function starteRunde() {
  ton.an();
  neueRunde(gewaehlteFigur, gewaehlteKarte);
  zeigeSchirm(null);
  $("hud").hidden = false;
  zeigeHinweis(`🏪 Willkommen im tuum! Noch ${zeitText(SPIEL_DAUER)} bis Ladenschluss.`);
}

// ----- Anzeige oben -----
let hudStand = "";
function aktualisiereHud() {
  $("xpFuellung").style.width = (100 * Math.min(1, G.xp / G.xpNext)) + "%";
  // Boss-Leiste oben
  const boss = G.gegner.find(e => e.boss);
  $("bossBalken").hidden = !boss;
  if (boss) {
    $("bossName").textContent = GEGNER[boss.typ].name;
    $("bossFuellung").style.width = (100 * Math.max(0, boss.leben / boss.maxLeben)) + "%";
  }
  const rest = Math.max(0, SPIEL_DAUER - G.zeit);
  const stand = `${G.lvl}|${Math.floor(rest)}|${G.kills}|${G.euro}|${G.waffen.map(w => w.id + w.stufe).join()}|${JSON.stringify(G.ausr)}`;
  if (stand === hudStand) return;
  hudStand = stand;
  $("hudLevel").textContent = `Lv ${G.lvl}`;
  $("hudZeit").textContent = zeitText(rest);
  $("hudZeit").classList.toggle("knapp", rest < 60);
  $("hudKills").textContent = zahl(G.kills);
  $("hudEuro").textContent = zahl(G.euro);
  $("hudWaffen").innerHTML = G.waffen.map(w => `<span title="${WAFFEN[w.id].name}">${WAFFEN[w.id].icon}<i>${w.stufe}</i></span>`).join("")
    + Object.keys(G.ausr).map(id => `<span class="ausr" title="${AUSRUESTUNG[id].name}">${AUSRUESTUNG[id].icon}<i>${G.ausr[id]}</i></span>`).join("");
}

// ----- Meldungen -----
function zeigeBanner(text) {
  const b = $("banner");
  b.textContent = text;
  b.classList.remove("an"); void b.offsetWidth; b.classList.add("an");
}
function zeigeHinweis(text) {
  const h = document.createElement("div");
  h.className = "hinweis"; h.textContent = text;
  $("hinweise").append(h);
  while ($("hinweise").children.length > 3) $("hinweise").firstChild.remove();
  setTimeout(() => h.remove(), 3200);
}

// ----- Level-Auswahl -----
const STUFEN_TEXTE = {
  anzahl: v => `+${v} ${v === 1 ? "Geschoss" : "Geschosse"}`, schaden: v => `+${v} Schaden`, cd: v => `${Math.round(-v * 100)} % schneller`,
  durchschlag: v => `+${v} Durchschlag`, bereich: v => `+${Math.round(v * 100)} % Bereich`, dauer: v => `+${String(v).replace(".", ",")} s Dauer`,
  tempo: () => "dreht schneller",
};
function optionText(o) {
  if (o.art === "heil") return { icon: "🌭", titel: "Bratwurst", text: "+40 Leben" };
  if (o.art === "geld") return { icon: "💶", titel: "Trinkgeld", text: "+15 €" };
  if (o.art === "waffe") {
    const W = WAFFEN[o.id];
    if (o.stufe === 1) return { icon: W.icon, titel: W.name, text: W.text, neu: true };
    const s = W.stufen[o.stufe - 2];
    return { icon: W.icon, titel: W.name, stufe: o.stufe, text: Object.keys(s).filter(k => !(o.id === "kreissaege" && k === "tempo" && s.bereich)).map(k => STUFEN_TEXTE[k](s[k])).join(", ") };
  }
  const A = AUSRUESTUNG[o.id];
  return { icon: A.icon, titel: A.name, text: A.text, neu: o.stufe === 1, stufe: o.stufe > 1 ? o.stufe : 0 };
}
function zeigeLevelAuswahl() {
  if (!G || G.ende || !$("levelup").hidden) return;
  G.pause = true;
  ton.levelUp();
  const liste = $("levelListe");
  liste.textContent = "";
  $("levelTitel").textContent = `Level ${G.lvl - G.offeneLevel + 1}!`;
  for (const o of levelOptionen()) {
    const t = optionText(o);
    const k = document.createElement("button");
    k.className = "levelKarte";
    const max = o.art === "waffe" ? 8 : o.art === "ausr" ? (AUSRUESTUNG[o.id].max || 5) : 0;
    const punkte = max ? `<div class="levelPunkte">${"<i class=\"an\"></i>".repeat(o.stufe)}${"<i></i>".repeat(max - o.stufe)}</div>` : "";
    k.className = "levelKarte" + (t.neu ? " istNeu" : "");
    k.innerHTML = `<span class="levelIcon">${t.icon}</span><div><b>${t.titel}</b> ${t.neu ? '<span class="neu">NEU</span>' : t.stufe ? `<span class="stufe">Stufe ${t.stufe}</span>` : ""}<div class="klein">${t.text}</div>${punkte}</div>`;
    k.addEventListener("click", () => {
      waehleOption(o);
      G.offeneLevel--;
      zeigeOverlay("levelup", false);
      hudStand = "";
      if (G.offeneLevel > 0) setTimeout(zeigeLevelAuswahl, 120);
      else G.pause = false;
    });
    liste.append(k);
  }
  zeigeOverlay("levelup", true);
}

// ----- Pause -----
function umschaltenPause() {
  if (!G || G.ende || !$("levelup").hidden) return;
  const an = $("pause").hidden;
  G.pause = an;
  if (an) {
    $("pauseInhalt").innerHTML = `<div class="klein">Zeit: ${zeitText(G.zeit)} · Level ${G.lvl} · ${zahl(G.kills)} besiegt</div><div class="ausruestungListe">`
      + G.waffen.map(w => `<div>${WAFFEN[w.id].icon} ${WAFFEN[w.id].name} <b>${w.stufe}</b></div>`).join("")
      + Object.keys(G.ausr).map(id => `<div>${AUSRUESTUNG[id].icon} ${AUSRUESTUNG[id].name} <b>${G.ausr[id]}</b></div>`).join("") + "</div>";
  }
  zeigeOverlay("pause", an);
}

// ----- Ende -----
function beendeRunde(sieg) {
  if (G.ende) return;
  G.ende = sieg ? "sieg" : "tot";
  G.pause = true;
  const bonus = sieg ? 100 : 0;
  const verdient = G.euro + bonus + Math.floor(G.kills / 25);
  SP.euro += verdient; SP.runden++;
  if (sieg) SP.siege++;
  if (G.zeit > SP.rekord.zeit) SP.rekord = { zeit: Math.floor(G.zeit), kills: G.kills, lvl: G.lvl };
  speichern();
  ton.ende(sieg);
  $("endeTitel").textContent = sieg ? "🔔 Ladenschluss! Feierabend!" : "💥 Umgehauen!";
  $("endeText").textContent = sieg ? `${G.fig.name} hat in der ${G.karte.name} bis zum Ladenschluss durchgehalten. Ab nach Hause!` : `${G.fig.name} hat ${zeitText(G.zeit)} in der ${G.karte.name} durchgehalten.`;
  const kr = SP.kartenRekord = SP.kartenRekord || {};
  if (G.zeit > (kr[G.karte.id] || 0)) kr[G.karte.id] = Math.floor(G.zeit);
  const waffenSchaden = Object.entries(G.schaden).sort((a, b) => b[1] - a[1])
    .map(([id, s]) => `<div>${WAFFEN[id].icon} ${WAFFEN[id].name}<span>${zahl(s)}</span></div>`).join("");
  $("endeWerte").innerHTML = `<div class="werteGitter">
      <div><span>Zeit</span><b>${zeitText(G.zeit)}</b></div><div><span>Level</span><b>${G.lvl}</b></div>
      <div><span>Besiegt</span><b>${zahl(G.kills)}</b></div><div><span>Verdient</span><b>${zahl(verdient)} €</b></div></div>
    <div class="klein" style="margin-top:6px">${zahl(G.euro)} € eingesammelt + ${zahl(Math.floor(G.kills / 25))} € Prämie${bonus ? ` + ${bonus} € Feierabend-Bonus` : ""}</div>
    <h3>Schaden</h3><div class="schadenListe">${waffenSchaden || "<div>–</div>"}</div>`;
  setTimeout(() => { zeigeOverlay("pause", false); zeigeOverlay("levelup", false); zeigeOverlay("ende", true); }, sieg ? 300 : 700);
}

// ----- Spielschleife -----
let letzteZeit = performance.now(), menueZeit = 0;
function schleife(jetzt) {
  let dt = Math.min(0.1, (jetzt - letzteZeit) / 1000);
  letzteZeit = jetzt;
  pinsel.setTransform(ansicht.dpr, 0, 0, ansicht.dpr, 0, 0);
  if (G) {
    if (!G.pause && !G.ende) {
      while (dt > 0) { const s = Math.min(dt, 1 / 30); aktualisiere(s); dt -= s; if (G.ende || G.pause) break; }
    }
    zeichneSpiel(pinsel);
    zeichneJoystick(pinsel);
    aktualisiereHud();
  } else {
    // Menü-Hintergrund: Halle mit Licht – und Stefan wird unten durchs Bild gejagt
    menueZeit += dt;
    zeichneMenue(pinsel, menueZeit);
  }
  requestAnimationFrame(schleife);
}

// ----- Start -----
function richteUiEin() {
  groesseAnpassen();
  richteJoystickEin(leinwand);
  $("spielenKnopf").addEventListener("click", zeigeFiguren);
  $("werkstattKnopf").addEventListener("click", zeigeWerkstatt);
  $("tonKnopf").addEventListener("click", () => { SP.ton = !SP.ton; speichern(); zeigeTitel(); });
  $("figurStart").addEventListener("click", zeigeKarten);
  $("karteStart").addEventListener("click", starteRunde);
  $("karteZurueck").addEventListener("click", zeigeFiguren);
  for (const b of document.querySelectorAll("[data-zurueck]")) b.addEventListener("click", zeigeTitel);
  $("pauseKnopf").addEventListener("click", umschaltenPause);
  $("weiterKnopf").addEventListener("click", umschaltenPause);
  $("aufgebenKnopf").addEventListener("click", () => { zeigeOverlay("pause", false); beendeRunde(false); });
  $("nochmalKnopf").addEventListener("click", () => { zeigeOverlay("ende", false); starteRunde(); });
  $("menueKnopf").addEventListener("click", () => { zeigeOverlay("ende", false); zeigeTitel(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden && G && !G.pause && !G.ende) umschaltenPause(); });
  // Grafiken mit Schrift (tuum, Schilder) neu malen, sobald die Schriftarten geladen sind
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => spriteSpeicher.clear());
  zeigeTitel();
  requestAnimationFrame(schleife);
}
richteUiEin();

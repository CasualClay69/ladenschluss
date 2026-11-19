"use strict";
// =====================================================
//  STARTBILDSCHIRM: 3 Sekunden mit Ladebalken (grüner Zollstock), wechselnden Texten und Versionsnummer.
//  Er steht schon im HTML (#splash) und ist deshalb vom ersten Moment an zu sehen.
// =====================================================

const SPLASH = {
  dauerMs: 3000,
  texte: [
    "Regale werden aufgefüllt …",
    "Einkaufswagen werden eingesammelt …",
    "Akkuschrauber wird geladen …",
    "Kasse 3 öffnet …",
    "Gleich ist Ladenschluss!",
  ],
};

(function startbildschirm() {
  const splash = document.getElementById("splash");
  if (!splash) return;
  document.getElementById("splashVersion").textContent = `Version ${APP_VERSION}`;

  const status = document.getElementById("splashStatus");
  let i = 0;
  const wechsel = setInterval(() => {
    i = Math.min(i + 1, SPLASH.texte.length - 1);
    status.textContent = SPLASH.texte[i];
  }, SPLASH.dauerMs / SPLASH.texte.length);

  // 3 Sekunden ab dem Öffnen der Seite (die Ladezeit zählt mit), dann weich ausblenden
  const rest = Math.max(0, SPLASH.dauerMs - performance.now());
  setTimeout(() => {
    clearInterval(wechsel);
    splash.classList.add("weg");
    setTimeout(() => splash.remove(), 700);
  }, rest);
})();

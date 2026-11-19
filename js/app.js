"use strict";
// =====================================================
//  APP: offline spielen und aufs Handy installieren (Service Worker in sw.js).
//  Neue Versionen holt sich das Spiel im Hintergrund – beim nächsten Start sind sie da.
// =====================================================

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// ----- Auf Handys nur im Querformat -----
// Hochkant zeigt die CSS einen "Bitte drehen"-Hinweis (#drehen); eine laufende Runde pausiert dann.
const hochkant = window.matchMedia("(pointer: coarse) and (orientation: portrait)");
function pruefeHochkant() {
  if (hochkant.matches && G && !G.pause && !G.ende) umschaltenPause();
}
hochkant.addEventListener ? hochkant.addEventListener("change", pruefeHochkant) : hochkant.addListener(pruefeHochkant);

// Beim Schichtbeginn auf Touch-Geräten: Vollbild und Querformat festhalten (klappt v. a. auf Android;
// iPhones erlauben das Sperren nicht – dort hilft der Drehen-Hinweis)
function querformatFesthalten() {
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const sperren = () => { try { screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* nicht unterstützt */ } };
  if (window.matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches) { sperren(); return; }
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen({ navigationUI: "hide" }).then(sperren).catch(() => {});
  else sperren();
}
document.getElementById("figurStart").addEventListener("click", querformatFesthalten);
document.getElementById("nochmalKnopf").addEventListener("click", querformatFesthalten);

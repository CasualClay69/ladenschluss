"use strict";
// =====================================================
//  APP: offline spielen und aufs Handy installieren (Service Worker in sw.js).
//  Neue Versionen holt sich das Spiel im Hintergrund – beim nächsten Start sind sie da.
// =====================================================

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

// ----- Neue Version verfügbar? -----
// Schaut regelmäßig auf dem Server nach js/version.js. Ist sie neuer, kommt ein Fenster –
// aber nie mitten in einer Runde (dann wartet es, bis man wieder im Menü ist).
function istNeuer(a, b) {
  const x = a.split(".").map(Number), y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
let updateSpaeter = false;
window.updateWartet = false;
async function pruefeAufUpdate() {
  if (updateSpaeter || !location.protocol.startsWith("http")) return;
  try {
    const antwort = await fetch(`js/version.js?frisch=${Date.now()}`, { cache: "no-store" });
    if (!antwort.ok) return;
    const text = await antwort.text();
    const version = (text.match(/APP_VERSION\s*=\s*"([^"]+)"/) || [])[1];
    const neu = (text.match(/APP_NEU\s*=\s*"([^"]*)"/) || [])[1] || "";
    if (!version || !istNeuer(version, APP_VERSION)) return;
    if (G && !G.ende) { window.updateWartet = true; return; }   // erst nach der Runde
    window.updateWartet = false;
    document.getElementById("updateText").textContent = `Du spielst Version ${APP_VERSION} – neu ist Version ${version}.`;
    document.getElementById("updateNeu").textContent = neu ? "🆕 " + neu : "";
    document.getElementById("update").hidden = false;
  } catch (e) { /* offline – später nochmal */ }
}
// Alle Dateien frisch holen, Speicher leeren, neu starten (alte und neue Dateien dürfen sich nie mischen)
async function aktualisiereApp() {
  document.getElementById("updateJetzt").textContent = "⏳ Einen Moment …";
  try { await Promise.all(APP_DATEIEN.map(d => fetch(d, { cache: "reload" }))); } catch (e) { /* trotzdem weiter */ }
  try { for (const r of await navigator.serviceWorker.getRegistrations()) if (r.scope === new URL("./", location.href).href) await r.unregister(); } catch (e) { /* egal */ }
  try { for (const n of await caches.keys()) if (n.startsWith("ladenschluss-v")) await caches.delete(n); } catch (e) { /* egal */ }
  location.reload();
}
document.getElementById("updateJetzt").addEventListener("click", aktualisiereApp);
document.getElementById("updateSpaeter").addEventListener("click", () => { updateSpaeter = true; document.getElementById("update").hidden = true; });
setTimeout(pruefeAufUpdate, 4000);
setInterval(pruefeAufUpdate, 30 * 60 * 1000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) pruefeAufUpdate(); });

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
document.getElementById("karteStart").addEventListener("click", querformatFesthalten);
document.getElementById("nochmalKnopf").addEventListener("click", querformatFesthalten);

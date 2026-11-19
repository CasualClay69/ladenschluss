"use strict";
// =====================================================
//  VERSION – bei jeder Änderung hochzählen, dann holen sich alle die neue Version.
//  APP_DATEIEN: alle Dateien, die für das Offline-Spielen gespeichert werden (sw.js).
//  Neue Dateien hier eintragen!
// =====================================================
const APP_VERSION = "1.3";
// Kurz, was neu ist – steht im Fenster "Neue Version!" (bitte keine " im Text)
const APP_NEU = "Neu: Karten! Die erste ist die Farben-Abteilung – mit Farbklecksen, Pinseln, Rollern, Sprühdosen, Tapetenrollen und drei neuen Bossen bis zum Farbmeister.";
const APP_DATEIEN = [
  "./", "index.html", "manifest.webmanifest", "css/style.css",
  "js/version.js", "js/splash.js", "js/daten.js", "js/speicher.js", "js/ton.js", "js/zeichnen.js", "js/effekte.js",
  "js/eingabe.js", "js/spiel.js", "js/ui.js", "js/app.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];

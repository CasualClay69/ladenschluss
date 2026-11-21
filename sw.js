"use strict";
// =====================================================
//  SERVICE WORKER – macht Ladenschluss offline spielbar und installierbar
//
//  "stale-while-revalidate": Dateien sofort aus dem Speicher liefern (schneller Start, auch offline)
//  und im Hintergrund die neueste Version vom Server holen.
//  Dateiliste und Versionsnummer: js/version.js. Google-Schriften werden ebenfalls gespeichert.
// =====================================================

importScripts("js/version.js");
const CACHE = "ladenschluss-v" + APP_VERSION;
const SCHRIFTEN = "ladenschluss-schriften";

self.addEventListener("install", ereignis => {
  ereignis.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_DATEIEN.map(datei => new Request(datei, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", ereignis => {
  ereignis.waitUntil(
    caches.keys()
      .then(namen => Promise.all(namen.filter(n => n.startsWith("ladenschluss-v") && n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", ereignis => {
  const anfrage = ereignis.request;
  if (anfrage.method !== "GET") return;
  const adresse = new URL(anfrage.url);

  if (adresse.hostname === "fonts.googleapis.com" || adresse.hostname === "fonts.gstatic.com") {
    ereignis.respondWith(
      caches.open(SCHRIFTEN).then(cache => cache.match(anfrage).then(gespeichert => gespeichert ||
        fetch(anfrage).then(antwort => { if (antwort.ok || antwort.type === "opaque") cache.put(anfrage, antwort.clone()); return antwort; })))
    );
    return;
  }
  if (adresse.origin !== location.origin) return;
  if (adresse.searchParams.has("frisch")) return;   // Versions-Check (js/app.js): immer direkt vom Server, nie aus dem Speicher

  ereignis.respondWith(
    caches.open(CACHE).then(cache => cache.match(anfrage, { ignoreSearch: true }).then(gespeichert => {
      const frisch = fetch(anfrage).then(antwort => { if (antwort.ok) cache.put(anfrage, antwort.clone()); return antwort; }).catch(() => gespeichert);
      return gespeichert || frisch;
    }))
  );
});

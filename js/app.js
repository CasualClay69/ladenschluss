"use strict";
// =====================================================
//  APP: offline spielen und aufs Handy installieren (Service Worker in sw.js).
//  Neue Versionen holt sich das Spiel im Hintergrund – beim nächsten Start sind sie da.
// =====================================================

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

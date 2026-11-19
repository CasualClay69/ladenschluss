"use strict";
// =====================================================
//  SPEICHER: Euro, Werkstatt-Stufen, Rekorde und Einstellungen (bleiben im Browser).
// =====================================================

const SPEICHER_SCHLUESSEL = "ladenschluss-v1";
const SP = { euro: 0, werkstatt: {}, rekord: { zeit: 0, kills: 0, lvl: 0 }, siege: 0, runden: 0, ton: true };
try { Object.assign(SP, JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) || "{}")); } catch (e) { /* neu anfangen */ }

function speichern() {
  try { localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(SP)); } catch (e) { /* egal */ }
}
const werkstattStufe = id => SP.werkstatt[id] || 0;

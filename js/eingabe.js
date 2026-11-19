"use strict";
// =====================================================
//  EINGABE: Tastatur (WASD / Pfeiltasten) und Touch-Joystick (irgendwo auf den Bildschirm tippen und ziehen).
// =====================================================

const eingabe = { x: 0, y: 0 };
const tasten = new Set();
const joystick = { aktiv: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
const JOYSTICK_RADIUS = 46;

function eingabeAusTasten() {
  if (joystick.aktiv) return;
  let x = 0, y = 0;
  if (tasten.has("ArrowLeft") || tasten.has("KeyA")) x--;
  if (tasten.has("ArrowRight") || tasten.has("KeyD")) x++;
  if (tasten.has("ArrowUp") || tasten.has("KeyW")) y--;
  if (tasten.has("ArrowDown") || tasten.has("KeyS")) y++;
  eingabe.x = x; eingabe.y = y;
}

window.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
  tasten.add(e.code);
  eingabeAusTasten();
  if ((e.code === "Escape" || e.code === "KeyP") && G && !G.ende) umschaltenPause();
});
window.addEventListener("keyup", e => { tasten.delete(e.code); eingabeAusTasten(); });
window.addEventListener("blur", () => { tasten.clear(); eingabeAusTasten(); });

function richteJoystickEin(leinwand) {
  leinwand.addEventListener("pointerdown", e => {
    if (!G || G.pause || G.ende || joystick.aktiv) return;
    joystick.aktiv = true; joystick.id = e.pointerId;
    joystick.ox = joystick.x = e.clientX; joystick.oy = joystick.y = e.clientY;
    leinwand.setPointerCapture(e.pointerId);
    ton.an();
  });
  leinwand.addEventListener("pointermove", e => {
    if (!joystick.aktiv || e.pointerId !== joystick.id) return;
    let dx = e.clientX - joystick.ox, dy = e.clientY - joystick.oy;
    const l = Math.hypot(dx, dy);
    if (l > JOYSTICK_RADIUS) {   // Mitte wandert mit, wenn man weiter zieht
      joystick.ox += dx / l * (l - JOYSTICK_RADIUS); joystick.oy += dy / l * (l - JOYSTICK_RADIUS);
      dx = e.clientX - joystick.ox; dy = e.clientY - joystick.oy;
    }
    joystick.x = e.clientX; joystick.y = e.clientY;
    eingabe.x = dx / JOYSTICK_RADIUS; eingabe.y = dy / JOYSTICK_RADIUS;
  });
  const los = e => {
    if (e.pointerId !== joystick.id) return;
    joystick.aktiv = false; joystick.id = null;
    eingabe.x = 0; eingabe.y = 0;
    eingabeAusTasten();
  };
  leinwand.addEventListener("pointerup", los);
  leinwand.addEventListener("pointercancel", los);
}

function zeichneJoystick(x) {
  if (!joystick.aktiv) return;
  x.globalAlpha = 0.35; x.fillStyle = "#ffffff";
  x.beginPath(); x.arc(joystick.ox, joystick.oy, JOYSTICK_RADIUS, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 0.7; x.fillStyle = "#e30613";
  x.beginPath(); x.arc(joystick.ox + eingabe.x * JOYSTICK_RADIUS, joystick.oy + eingabe.y * JOYSTICK_RADIUS, 20, 0, Math.PI * 2); x.fill();
  x.globalAlpha = 1;
}

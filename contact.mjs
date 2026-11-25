// Swept simultaneous overlap in player-relative coordinates. Side describes
// where the other car is, so a player shove on x must use the opposite sign.
const EPSILON = 1e-9;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value) => Number.isFinite(value) ? value : 0;

function slab(from, delta, half) {
  if (Math.abs(delta) <= EPSILON) {
    return Math.abs(from) <= half ? [-Infinity, Infinity] : null;
  }
  const a = (-half - from) / delta;
  const b = (half - from) / delta;
  return [Math.min(a, b), Math.max(a, b)];
}

export function sweptContact({ dx0, dz0, dx1, dz1, halfX, halfZ }) {
  if (![dx0, dz0, dx1, dz1, halfX, halfZ].every(Number.isFinite) || halfX <= 0 || halfZ <= 0) return null;
  const vx = dx1 - dx0;
  const vz = dz1 - dz0;
  const x = slab(dx0, vx, halfX);
  const z = slab(dz0, vz, halfZ);
  if (!x || !z) return null;

  const entry = Math.max(x[0], z[0]);
  const exit = Math.min(x[1], z[1]);
  if (entry > exit + EPSILON || exit < 0 || entry > 1) return null;

  if (entry < 0) {
    // A spawned or persistent overlap has no entry face. Prefer the face
    // requiring the least fractional separation; stationary contacts are valid.
    const axis = Math.abs(dx0 / halfX) >= Math.abs(dz0 / halfZ) ? 'x' : 'z';
    const offset = axis === 'x' ? dx0 : dz0;
    const delta = axis === 'x' ? vx : vz;
    return { t: 0, axis, side: offset < 0 || (offset === 0 && delta < 0) ? -1 : 1 };
  }

  const axis = x[0] > z[0] ? 'x' : 'z';
  const offset = axis === 'x' ? dx0 + vx * entry : dz0 + vz * entry;
  return { t: clamp(entry, 0, 1), axis, side: offset < 0 ? -1 : 1 };
}

export function collisionResponse({ contact, speed, otherSpeed, lateralSpeed, otherLateralSpeed }) {
  const current = Math.max(0, finite(speed));
  if (!contact || (contact.axis !== 'x' && contact.axis !== 'z')) {
    return { severity: 'scrape', speed: current, shove: 0, energy: 0 };
  }
  const side = contact.side < 0 ? -1 : 1;
  const relativeForward = (current - Math.max(0, finite(otherSpeed))) * side;
  const relativeLateral = (finite(lateralSpeed) - finite(otherLateralSpeed)) * side;
  const axisX = contact.axis === 'x';
  const closing = Math.max(0, axisX ? relativeLateral : relativeForward);
  const energy = clamp(closing / (axisX ? 1.65 : 90), 0, 1);
  const severity = energy >= (axisX ? 0.54 : 0.38) ? 'hit' : 'scrape';
  // The other car never adds speed. A rear hit takes less momentum than a
  // frontal impact, and side contact primarily moves the player away.
  const lossFraction = axisX ? energy * 0.18 : energy * (side === 1 ? 0.44 : 0.19);
  const loss = clamp(current * lossFraction, 0, current);
  const shove = axisX ? -side * (0.012 + energy * 0.105) : 0;
  return { severity, speed: current - loss, shove, energy };
}

/**
 * Funções utilitárias
 */

/**
 * Interpolação linear entre dois valores
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Converte graus para radianos
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Gera um número aleatório entre min e max
 */
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Limita um valor entre min e max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normaliza um valor entre 0 e 1
 */
export function normalize(value, min, max) {
  return (value - min) / (max - min);
}

/**
 * Mapeia um valor de um range para outro
 */
export function map(value, inMin, inMax, outMin, outMax) {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Calcula a distância entre dois pontos
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Verifica se um ponto está dentro de um retângulo
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Verifica colisão entre dois retângulos
 */
export function rectCollision(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
  return !(
    r1x + r1w < r2x ||
    r1x > r2x + r2w ||
    r1y + r1h < r2y ||
    r1y > r2y + r2h
  );
}

/**
 * Formata um número com zeros à esquerda
 */
export function padZero(num, size) {
  return num.toString().padStart(size, "0");
}

/**
 * Formata tempo em mm:ss
 */
export function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${padZero(minutes, 2)}:${padZero(seconds, 2)}`;
}

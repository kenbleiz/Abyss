/**
 * Temps écoulé (en secondes) entre deux images d'animation, borné entre 0 et `max`.
 * L'horodatage passé par requestAnimationFrame peut précéder un `performance.now()`
 * lu juste avant : sans plancher, le premier dt serait négatif.
 */
export function frameDelta(now: number, last: number, max = 0.1): number {
  const dt = (now - last) / 1000;
  if (!Number.isFinite(dt) || dt <= 0) return 0;
  return Math.min(max, dt);
}

/** Indice toujours compris entre 0 et length - 1, même pour une valeur négative. */
export function wrapIndex(i: number, length: number): number {
  if (length <= 0 || !Number.isFinite(i)) return 0;
  return ((i % length) + length) % length;
}

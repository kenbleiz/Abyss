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

/** Nombre maximal de lignes du bac (voir AquariumSim.resize). */
export const MAX_ROWS = 80;

/**
 * Hauteur d'une case en pixels. Sur un écran très haut (1080×1920), on
 * agrandit les cases pour que MAX_ROWS lignes remplissent toute la hauteur.
 */
export function cellHeightFor(height: number): number {
  return Math.max(12, Math.min(22, Math.floor(height / 42)), Math.ceil(height / MAX_ROWS));
}

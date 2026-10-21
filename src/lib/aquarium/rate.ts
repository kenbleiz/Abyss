/** Limiteur à fenêtre glissante : au plus `max` appels par `windowMs`. */
export function createRateLimiter(max: number, windowMs: number, now: () => number = () => Date.now()) {
  const hits: number[] = [];
  return (): boolean => {
    const t = now();
    while (hits.length && t - hits[0] >= windowMs) hits.shift();
    if (hits.length >= max) return false;
    hits.push(t);
    return true;
  };
}

/**
 * Deterministic pseudo-random hash that returns the same value for the
 * same (row, col, seed). Returns a fractional value in [0, 1).
 *
 * Same constants as Rotation's 'random' pattern; extracted so multiple
 * treatments share one source of "stable noise".
 */
export function deterministicHash(row: number, col: number, seed: number): number {
  const v = Math.sin(row * 12.9898 + col * 78.233 + seed * 0.0001) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * Pick a character from `pool` at integer `index`, wrapping with modulo.
 * Returns empty string if pool is empty.
 */
export function pickFromPool(pool: string, index: number): string {
  if (pool.length === 0) return '';
  const idx = Math.floor(index);
  const wrapped = ((idx % pool.length) + pool.length) % pool.length;
  return pool[wrapped];
}

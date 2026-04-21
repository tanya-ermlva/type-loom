import type { Cell } from '../types';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Blend between two cell states by t (0..1).
 * t=0 returns `a`, t=1 returns `b`. In between, numeric properties
 * interpolate; visibility falls back to a binary threshold (>=0.5 → b).
 *
 * Used for soft-edged masks: a treatment that ordinarily fully transforms
 * a cell can apply *partially* by blending the original cell with the
 * treated cell weighted by mask coverage.
 */
export function blendCells(a: Cell, b: Cell, t: number): Cell {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    char: b.char,
    position: { x: lerp(a.position.x, b.position.x, t), y: lerp(a.position.y, b.position.y, t) },
    scale: lerp(a.scale, b.scale, t),
    rotation: lerp(a.rotation, b.rotation, t),
    color: lerpHexColor(a.color, b.color, t),
    opacity: lerp(a.opacity, b.opacity, t),
    visible: t >= 0.5 ? b.visible : a.visible,
    silhouetteCoverage: lerp(a.silhouetteCoverage, b.silhouetteCoverage, t),
  };
}

function lerpHexColor(a: string, b: string, t: number): string {
  // Bail out if either value isn't a 6-hex string we understand.
  if (a === b) return a;
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) {
    return t >= 0.5 ? b : a;
  }
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

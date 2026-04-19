import type { Cell } from '../types';
import type { Treatment } from './types';

export type TintMode = 'opacity' | 'color';
export type TintPattern = 'radial' | 'linear-x' | 'linear-y';

export interface TintParams {
  mode: TintMode;
  pattern: TintPattern;
  // For opacity mode:
  minOpacity: number;
  maxOpacity: number;
  // For color mode (gradient between two colors):
  colorA: string;
  colorB: string;
}

/**
 * Tint treatment: varies per-cell opacity or color by a function of
 * cell position in the grid.
 *
 * - mode 'opacity': interpolates opacity between min and max
 * - mode 'color': interpolates color between colorA and colorB (overrides cell color)
 */
export function createTint(params: TintParams): Treatment {
  return {
    id: crypto.randomUUID(),
    type: 'tint',
    enabled: true,
    apply(cell: Cell, row: number, col: number, ctx) {
      let t: number; // 0..1
      switch (params.pattern) {
        case 'radial': {
          const nx = ctx.columns <= 1 ? 0 : (col / (ctx.columns - 1)) * 2 - 1;
          const ny = ctx.rows <= 1 ? 0 : (row / (ctx.rows - 1)) * 2 - 1;
          t = Math.min(1, Math.sqrt(nx * nx + ny * ny));
          break;
        }
        case 'linear-x':
          t = ctx.columns <= 1 ? 0 : col / (ctx.columns - 1);
          break;
        case 'linear-y':
          t = ctx.rows <= 1 ? 0 : row / (ctx.rows - 1);
          break;
      }

      if (params.mode === 'opacity') {
        const opacity = params.minOpacity + (params.maxOpacity - params.minOpacity) * t;
        return { ...cell, opacity: cell.opacity * opacity };
      } else {
        return { ...cell, color: lerpHexColor(params.colorA, params.colorB, t) };
      }
    },
  };
}

function lerpHexColor(a: string, b: string, t: number): string {
  const ha = a.replace('#', '').padEnd(6, '0');
  const hb = b.replace('#', '').padEnd(6, '0');
  const ar = parseInt(ha.slice(0, 2), 16);
  const ag = parseInt(ha.slice(2, 4), 16);
  const ab = parseInt(ha.slice(4, 6), 16);
  const br = parseInt(hb.slice(0, 2), 16);
  const bg = parseInt(hb.slice(2, 4), 16);
  const bb = parseInt(hb.slice(4, 6), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}

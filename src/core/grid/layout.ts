import type { BaseGridConfig, Cell } from '../types';
import { fillRow } from './input';

/**
 * Compute the baseline grid layout from the base config.
 * Returns one Cell per (row, column) position with character resolved
 * from the input and identity rendering values.
 */
export function computeLayout(config: BaseGridConfig): Cell[] {
  const { canvas, hDistance, vDistance, input, fgColor } = config;
  const columns = Math.floor(canvas.width / hDistance);
  const rows = Math.floor(canvas.height / vDistance);
  const cells: Cell[] = [];

  for (let r = 0; r < rows; r++) {
    const rowText = fillRow(input, columns);
    for (let c = 0; c < columns; c++) {
      cells.push({
        char: rowText[c] ?? ' ',
        position: {
          x: c * hDistance + hDistance / 2,
          y: r * vDistance + vDistance / 2,
        },
        scale: 1,
        rotation: 0,
        color: fgColor,
        opacity: 1,
        visible: true,
      });
    }
  }

  return cells;
}

import type { BaseGridConfig, Cell } from '../types';

/**
 * Compute the baseline grid layout from the base config.
 *
 * Per-row flow: each row is filled with the input word, repeated.
 * Within a word, letters are spaced by `charSpacing`. Between word
 * repetitions, an additional `columnSpacing` gap is inserted.
 *
 * The number of rows and word repetitions per row is bounded by the canvas
 * size minus `edgePadding` on each side. Centering is done relative to the
 * full canvas, so unused space is symmetric and edgePadding becomes a
 * minimum clear zone around the grid.
 *
 * Returns one Cell per (row, column) position with character resolved
 * from the input and identity rendering values.
 */
export function computeLayout(config: BaseGridConfig): Cell[] {
  const { canvas, charSpacing, columnSpacing, rowSpacing, input, fgColor } = config;
  const cells: Cell[] = [];
  if (input.length === 0 || charSpacing <= 0 || rowSpacing <= 0) return cells;

  const edgePadding = Math.max(0, config.edgePadding ?? 0);
  const usableWidth = Math.max(0, canvas.width - 2 * edgePadding);
  const usableHeight = Math.max(0, canvas.height - 2 * edgePadding);

  const wordWidth = input.length * charSpacing;
  const period = wordWidth + columnSpacing;
  const numWords = Math.max(1, Math.floor(usableWidth / period));
  const columns = numWords * input.length;
  const rows = Math.max(0, Math.floor(usableHeight / rowSpacing));

  // Center the composition both axes by offsetting by half the unused margin.
  const contentWidth = numWords * wordWidth + Math.max(0, numWords - 1) * columnSpacing;
  const contentHeight = rows * rowSpacing;
  const xOffset = (canvas.width - contentWidth) / 2;
  const yOffset = (canvas.height - contentHeight) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const wordIndex = Math.floor(c / input.length);
      const charIndexInWord = c % input.length;
      const x = xOffset + wordIndex * period + charIndexInWord * charSpacing + charSpacing / 2;
      const y = yOffset + r * rowSpacing + rowSpacing / 2;
      cells.push({
        char: input[charIndexInWord],
        position: { x, y },
        scale: 1,
        rotation: 0,
        color: fgColor,
        opacity: 1,
        visible: true,
        silhouetteCoverage: 1,
      });
    }
  }

  return cells;
}

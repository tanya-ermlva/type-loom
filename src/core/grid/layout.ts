import type { BaseGridConfig, Cell } from '../types';

/**
 * Compute the baseline grid layout from the base config.
 *
 * Per-row flow: each row is filled with the input word, repeated.
 * Within a word, letters are spaced by `charSpacing`. Between word
 * repetitions, an additional `columnSpacing` gap is inserted.
 *
 * Returns one Cell per (row, column) position with character resolved
 * from the input and identity rendering values.
 */
export function computeLayout(config: BaseGridConfig): Cell[] {
  const { canvas, charSpacing, columnSpacing, rowSpacing, input, fgColor } = config;
  const cells: Cell[] = [];
  if (input.length === 0 || charSpacing <= 0 || rowSpacing <= 0) return cells;

  const wordWidth = input.length * charSpacing;
  const period = wordWidth + columnSpacing;
  const numWords = Math.max(1, Math.floor(canvas.width / period));
  const columns = numWords * input.length;
  const rows = Math.floor(canvas.height / rowSpacing);

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
      });
    }
  }

  return cells;
}

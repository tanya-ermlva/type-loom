import type { BaseGridConfig, Cell } from '../types';

/**
 * Clear the canvas to the background color and draw all visible cells.
 * Cells are drawn centered on their position, with rotation about the center.
 */
export function renderToCanvas(
  ctx: CanvasRenderingContext2D,
  cells: Cell[],
  config: BaseGridConfig,
): void {
  const { canvas, charSize, fontFamily, bgColor } = config;

  // Clear and fill background.
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set text rendering defaults.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const cell of cells) {
    const effectiveOpacity = cell.opacity * cell.silhouetteCoverage;
    if (!cell.visible || effectiveOpacity <= 0) continue;
    if (cell.char === ' ' || cell.char === '') continue;

    ctx.save();
    ctx.translate(cell.position.x, cell.position.y);
    if (cell.rotation !== 0) ctx.rotate(cell.rotation);
    if (cell.scale !== 1) ctx.scale(cell.scale, cell.scale);
    ctx.globalAlpha = effectiveOpacity;
    ctx.fillStyle = cell.color;
    ctx.font = `${charSize}px ${fontFamily}`;
    ctx.fillText(cell.char, 0, 0);
    ctx.restore();
  }
}

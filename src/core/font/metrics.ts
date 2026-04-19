export interface MeasureRequest {
  fontFamily: string;
  fontSize: number;
  sampleChar: string;  // typically 'M' (the widest glyph in most fonts)
}

export interface CellMetrics {
  width: number;       // advance width in px
  height: number;      // suggested line height in px
}

/**
 * Measure the rendered size of a sample character at a given font size.
 * Uses an offscreen canvas; works only in environments where 'canvas' is
 * available (browser + jsdom test environment).
 */
export function measureMonospaceCell(req: MeasureRequest): CellMetrics {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // jsdom may not provide a 2d context; fall back to a sensible estimate.
    return {
      width: req.fontSize * 0.6,
      height: req.fontSize * 1.2,
    };
  }
  ctx.font = `${req.fontSize}px ${req.fontFamily}`;
  const m = ctx.measureText(req.sampleChar);
  const width = m.width || req.fontSize * 0.6;
  const ascent = m.actualBoundingBoxAscent ?? req.fontSize * 0.8;
  const descent = m.actualBoundingBoxDescent ?? req.fontSize * 0.2;
  const height = (ascent + descent) * 1.2;
  return { width, height };
}

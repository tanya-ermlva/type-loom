/**
 * Background palette and FG/BG picker.
 *
 * The visual identity is: the BG comes from a curated palette of saturated
 * tones; the FG is always pure black or pure white — whichever gives the
 * stronger contrast against that BG. Picked on each app load (and via the
 * Randomize button) to keep the default canvas visually fresh.
 */

export interface ColorPair {
  fg: string;
  bg: string;
}

/**
 * Background palette, organized by ramp:
 * - greens (primary)
 * - blues, oranges, purples, rust/yellows, pinks, olives (secondary)
 */
export const BG_PALETTE: string[] = [
  // Primary — greens
  '#434625', '#5B6F00', '#78BC15', '#B2C248', '#D1E043', '#E5EACD',
  // Blues
  '#3E49B8', '#4691E2', '#B8D5FF', '#D2E4F8',
  // Oranges
  '#BD4A30', '#E95D3D', '#F29E8B', '#F8CEC5',
  // Purples
  '#564391', '#A191CE', '#CEBEF8', '#E8E4F3',
  // Rust/yellows
  '#BB4E23', '#ED9212', '#FFB567', '#FFEAA6',
  // Pinks
  '#A42962', '#FF91E0', '#FFBCEF', '#FFDEF6',
  // Olives
  '#40351A', '#BB9F56', '#E5CD75', '#EDE1A1',
];

/**
 * Pick the foreground that contrasts best with the given background.
 * Uses W3C-style relative luminance (sRGB → linear → coefficient sum).
 * Threshold ~0.5 reliably picks black for light BGs and white for dark.
 */
export function bestContrastingFG(bgHex: string): '#000000' | '#ffffff' {
  const m = /^#?([0-9a-f]{6})$/i.exec(bgHex);
  if (!m) return '#000000';
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;

  // Relative luminance per WCAG 2.1
  const toLin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);

  return L > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Pick a random BG from the palette and pair it with the best-contrast FG.
 */
export function pickRandomPalette(): ColorPair {
  const bg = BG_PALETTE[Math.floor(Math.random() * BG_PALETTE.length)];
  return { fg: bestContrastingFG(bg), bg };
}

/**
 * Curated FG/BG color pairs. Picked on each app load to keep the
 * default canvas visually fresh. Influenced by the inspiration set:
 * Swiss-poster cream/blue, editorial green/cream, etc.
 */

export interface ColorPair {
  fg: string;
  bg: string;
}

export const PALETTES: ColorPair[] = [
  { fg: '#1a1a4d', bg: '#f0ead6' },  // deep blue on cream
  { fg: '#0f5132', bg: '#dde9d4' },  // forest on pale green
  { fg: '#dde9d4', bg: '#0f5132' },  // pale green on forest
  { fg: '#8b1f1f', bg: '#f0ead6' },  // brick on cream
  { fg: '#1f4f8b', bg: '#fef3c7' },  // royal blue on butter
  { fg: '#f0ead6', bg: '#1a1a4d' },  // cream on deep blue
  { fg: '#000000', bg: '#f5f5dc' },  // ink on beige
  { fg: '#f0bb44', bg: '#1a1a4d' },  // amber on deep blue
  { fg: '#7d3c98', bg: '#fef3c7' },  // grape on butter
  { fg: '#1a1a1a', bg: '#fed7aa' },  // near-black on peach
  { fg: '#d72631', bg: '#f0ead6' },  // red on cream
  { fg: '#fef3c7', bg: '#7d3c98' },  // butter on grape
];

export function pickRandomPalette(): ColorPair {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)];
}

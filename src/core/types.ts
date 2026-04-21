// Geometry primitives
export interface Vec2 {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// A single rendered character cell
export interface Cell {
  // The character to draw (already resolved from input + flow mode)
  char: string;
  // Position of the cell's center in canvas pixels
  position: Vec2;
  // Treatment-modified rendering state
  scale: number;        // 1.0 = base size
  rotation: number;     // radians
  color: string;        // CSS color
  opacity: number;      // 0..1
  visible: boolean;     // false = skip drawing
  silhouetteCoverage: number;  // 0..1, default 1. Written by Silhouette treatments, multiplied into final opacity at render.
}

// The default render state for a cell before any treatment runs
export const IDENTITY_CELL: Omit<Cell, 'char' | 'position'> = {
  scale: 1,
  rotation: 0,
  color: '#1a1a4d',
  opacity: 1,
  visible: true,
  silhouetteCoverage: 1,
};

// Configuration for the base grid
export interface BaseGridConfig {
  canvas: Size;             // canvas dimensions in px
  charSize: number;         // font size in px
  rowSpacing: number;       // vertical px between rows (line height)
  charSpacing: number;      // horizontal px between letters within a word ("T" -> "Y")
  columnSpacing: number;    // horizontal px gap between word repetitions ("TYPE" -> "TYPE")
  flow: 'per-row';          // v0.1 only supports per-row
  fgColor: string;
  bgColor: string;
  input: string;
  fontFamily: string;       // system font name (custom upload deferred)
}

export const DEFAULT_BASE_CONFIG: BaseGridConfig = {
  canvas: { width: 1080, height: 1080 },
  charSize: 40,
  rowSpacing: 50,
  charSpacing: 30,
  columnSpacing: 20,
  flow: 'per-row',
  fgColor: '#1a1a4d',
  bgColor: '#f0ead6',
  input: 'TYPE',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
};

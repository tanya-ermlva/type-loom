export type FontRef =
  | { kind: 'system' }
  | { kind: 'custom'; name: string; objectUrl: string };

export type AspectRatio = '1:1' | '4:5' | '9:16' | 'free';
export type TextAlign = 'left' | 'center' | 'right';

// Cursor-driven mask: a wobbly blob that follows the mouse and (optionally)
// leaves a fading trail behind. All knobs live here.
export type CursorState = {
  size: number;          // 0.05..1, fraction of canvas covered by the blob
  wobbleAmount: number;  // 0..2, multiplier on outline displacement (1 = default)
  trailSeconds: number;  // 0..1.5, lifetime of trail samples (0 disables trail)
};

// Gooey filter parameters — applied to the gooey text layer wherever the
// cursor mask is opaque. feTurbulence + feDisplacementMap add organic noise
// to glyph edges; feGaussianBlur + feColorMatrix do the classic gooey.
export type EffectState = {
  blur: number;
  threshold: number;
  offset: number;
  noiseScale: number;
  noiseAmount: number;
};

export type Poster = {
  text: string;
  font: FontRef;
  fontSize: number;
  lineHeight: number;
  textColor: string;
  textAlign: TextAlign;
  fontWeight: number;

  background: string;
  aspectRatio: AspectRatio;

  cursor: CursorState;
  effect: EffectState;
};

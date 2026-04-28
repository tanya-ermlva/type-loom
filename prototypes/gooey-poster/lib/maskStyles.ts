import type { CSSProperties } from 'react';

// The cursor mask is a fullscreen SVG (in 0..1 viewBox) generated each frame
// by Canvas's rAF loop and stored in --cursor-mask. The browser re-resolves
// `mask-image: var(--cursor-mask)` as the variable changes — no React work
// per frame, mask-position/size stays constant.
export function cursorMaskStyle(): CSSProperties {
  return {
    maskImage: 'var(--cursor-mask, none)',
    WebkitMaskImage: 'var(--cursor-mask, none)',
    maskSize: '100% 100%',
    WebkitMaskSize: '100% 100%',
    maskPosition: '0 0',
    WebkitMaskPosition: '0 0',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
  };
}

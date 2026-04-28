import { usePosterStore } from '../store';

// Document-level SVG filter. Lives at the root once and is referenced by id
// from CSS (`filter: url(#gooey-poster-filter)`). The filter parameters are
// driven directly by the store so sliders update the visual instantly.
//
// Pipeline:
//   1. feTurbulence    — generate Perlin noise (a soft "weather map")
//   2. feDisplacementMap — push each pixel of the source by the noise vector
//      (this is where edges stop being mathematically clean and start to feel
//      like wet paint — pixel rows wobble with the noise pattern)
//   3. feGaussianBlur   — blur the displaced source
//   4. feColorMatrix    — alpha threshold; soft halo snaps back to a sharp,
//      now-organic edge
//   5. feComposite      — keep the original sharp glyphs where they coincide
export function GooeyFilter() {
  const blur = usePosterStore((s) => s.poster.effect.blur);
  const threshold = usePosterStore((s) => s.poster.effect.threshold);
  const offset = usePosterStore((s) => s.poster.effect.offset);
  const noiseScale = usePosterStore((s) => s.poster.effect.noiseScale);
  const noiseAmount = usePosterStore((s) => s.poster.effect.noiseAmount);

  return (
    <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
      <defs>
        <filter id="gooey-poster-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={noiseScale}
            numOctaves={2}
            seed={3}
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={noiseAmount}
            xChannelSelector="R"
            yChannelSelector="G"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation={blur} result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${threshold} ${offset}`}
            result="goo"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
    </svg>
  );
}

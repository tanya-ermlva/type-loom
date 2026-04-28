// Builds a fullscreen mask SVG (viewBox 0..1) for the cursor blob plus
// optional trail of fading samples. The whole SVG is sent to CSS as a
// data URL via --cursor-mask each frame; the browser handles the rest.
//
// Why "trail = circles, head = wobbly path": the head is the visual focus
// and benefits from organic outline. Trail samples are seen briefly and
// flowing into the head via the gooey filter — a circle is enough, and
// keeps generated SVG tiny (one element per sample).

const POINTS = 36;
const OVAL_AMOUNT = 0.10;
const OVAL_SPEED = 0.18;

const WOBBLE_AMPS = [0.085, 0.05, 0.028, 0.014];
const WOBBLE_FREQS = [3, 5, 9, 17];
const WOBBLE_SPEEDS = [0.55, 0.4, 0.28, 0.21];
const WOBBLE_PHASES = [0, 1.7, 3.1, 4.6];

export type TrailSample = { x: number; y: number; age: number /* 0..1 */ };

export type CursorMaskInput = {
  x: number;             // current cursor position, 0..1 of canvas
  y: number;
  size: number;          // 0..1, fraction of canvas covered
  wobbleAmount: number;  // multiplier on outline displacement
  time: number;          // seconds, drives the wobble animation
  trail: TrailSample[];  // newest first
};

export function cursorMaskSvg(input: CursorMaskInput): string {
  const { x, y, size, wobbleAmount, time, trail } = input;
  const baseR = size * 0.5;

  // Trail circles. Older samples are smaller and contribute less alpha.
  // The gooey filter on the text layer above will fuse them with the head.
  let trailEls = '';
  for (const s of trail) {
    const lifeLeft = 1 - s.age;
    if (lifeLeft <= 0) continue;
    const r = baseR * (0.6 + 0.4 * lifeLeft);   // shrinks 40% over lifetime
    if (r < 0.005) continue;
    const opacity = lifeLeft;                   // fades alpha for soft cutoff
    trailEls += `<circle cx="${s.x.toFixed(4)}" cy="${s.y.toFixed(4)}" r="${r.toFixed(4)}" fill="black" fill-opacity="${opacity.toFixed(3)}"/>`;
  }

  // Head — wobbly blob path centred on (x, y).
  const head = wobblyBlobPath(x, y, baseR, time, wobbleAmount);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">${trailEls}<path d="${head}" fill="black"/></svg>`;
}

// Builds a closed wobbly path centred at (cx, cy) with base radius `baseR`,
// sampled at POINTS angular steps, displaced by a sum of sines whose
// frequencies and phases produce a band-limited noise around the circle.
// `wobbleAmount` scales all displacement layers uniformly (0 = clean circle,
// 2 = very irregular).
export function wobblyBlobPath(
  cx: number,
  cy: number,
  baseR: number,
  time: number,
  wobbleAmount: number,
): string {
  let d = '';
  for (let i = 0; i < POINTS; i++) {
    const angle = (i / POINTS) * Math.PI * 2;

    // Slowly-rotating oval base — silhouette is never a stable shape.
    const ovalAxis = time * OVAL_SPEED;
    let r = baseR * (1 + OVAL_AMOUNT * Math.cos(2 * (angle - ovalAxis)));

    // Layered sines around the perimeter.
    let wobble = 0;
    for (let k = 0; k < WOBBLE_AMPS.length; k++) {
      wobble += WOBBLE_AMPS[k] *
        Math.sin(angle * WOBBLE_FREQS[k] + time * WOBBLE_SPEEDS[k] + WOBBLE_PHASES[k]);
    }
    r += baseR * wobble * wobbleAmount;

    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    d += i === 0
      ? `M${x.toFixed(4)} ${y.toFixed(4)}`
      : `L${x.toFixed(4)} ${y.toFixed(4)}`;
  }
  return d + 'Z';
}

export function maskSvgToDataUrl(svg: string): string {
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

import { useStore } from '../state/store';
import type { MaskParams } from '../core/mask/types';
import type { Size } from '../core/types';

/**
 * SVG overlay drawing dashed outlines for every active treatment's mask.
 * Auto-suppresses during playback so recordings/exports stay clean.
 *
 * - Blue outline = normal mask (effect applies inside)
 * - Red outline = inverted mask (effect applies outside)
 * - Lighter inner outline = soft-edge inner boundary (where coverage = 1)
 */
export function MaskOverlays() {
  const treatments = useStore((s) => s.treatments);
  const config = useStore((s) => s.config);
  const showMaskOverlays = useStore((s) => s.showMaskOverlays);
  const isPlaying = useStore((s) => s.isPlaying);

  if (!showMaskOverlays || isPlaying) return null;

  const masks = treatments
    .filter((t) => t.enabled && t.mask)
    .map((t) => t.mask!) as MaskParams[];

  if (masks.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${config.canvas.width} ${config.canvas.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {masks.map((m, i) => (
        <MaskOutline key={i} mask={m} canvas={config.canvas} />
      ))}
    </svg>
  );
}

function MaskOutline({ mask, canvas }: { mask: MaskParams; canvas: Size }) {
  const stroke = mask.invert ? '#ef4444' : '#3b82f6';
  // Stroke width as a fraction of the smaller canvas dimension so it stays
  // visible regardless of canvas resolution.
  const sw = Math.max(1.5, Math.min(canvas.width, canvas.height) / 400);

  if (mask.shape === 'circle') {
    const cx = mask.centerX * canvas.width;
    const cy = mask.centerY * canvas.height;
    // Use the smaller of width/height to keep the visual circle round even
    // when the canvas isn't square (mask coverage uses sizeX in canvas-x units).
    const r = mask.sizeX * canvas.width;
    const innerR = r * (1 - mask.softness);
    return (
      <g fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`}>
        <circle cx={cx} cy={cy} r={r} />
        {mask.softness > 0 && innerR > 0 && (
          <circle cx={cx} cy={cy} r={innerR} strokeOpacity={0.4} />
        )}
        <circle cx={cx} cy={cy} r={sw * 2} fill={stroke} stroke="none" opacity={0.6} />
      </g>
    );
  }

  const w = mask.sizeX * canvas.width * 2;
  const h = mask.sizeY * canvas.height * 2;
  const x = (mask.centerX - mask.sizeX) * canvas.width;
  const y = (mask.centerY - mask.sizeY) * canvas.height;
  const innerW = w * (1 - mask.softness);
  const innerH = h * (1 - mask.softness);
  const innerX = mask.centerX * canvas.width - innerW / 2;
  const innerY = mask.centerY * canvas.height - innerH / 2;
  return (
    <g fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray={`${sw * 4} ${sw * 3}`}>
      <rect x={x} y={y} width={w} height={h} />
      {mask.softness > 0 && innerW > 0 && innerH > 0 && (
        <rect x={innerX} y={innerY} width={innerW} height={innerH} strokeOpacity={0.4} />
      )}
    </g>
  );
}

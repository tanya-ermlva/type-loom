import { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_H, CANVAS_W, WORD_COLORS, useStore } from '../store';
import { buildRows, fieldAtProgress } from '../compress';
import type { Letter } from '../types';

// Render the A4 poster as SVG using the natural pixel coordinate space
// (1190 × 1684). The wrapping <div> scales the whole thing to fit the
// available area while preserving aspect ratio.
//
// All interaction (field move, resize, click-to-select) speaks in canvas
// px regardless of how the SVG is scaled to the screen — that's the point
// of using viewBox + an SVG-native CTM-based pointer mapping.

type DragState =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; edge: 'right' | 'left' | 'top' | 'bottom' }
  | { kind: 'force'; id: string; offsetX: number; offsetY: number }
  | { kind: 'target'; id: string; offsetX: number; offsetY: number };

const MIN_RADIUS = 20; // never let a field collapse to a point

export function Canvas() {
  const fields = useStore((s) => s.fields);
  const globals = useStore((s) => s.globals);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const selectField = useStore((s) => s.selectField);
  const updateField = useStore((s) => s.updateField);
  const progress = useStore((s) => s.progress);

  // Effective fields = fields with their force center interpolated to the
  // current playback progress. When progress = 0 (paused at start) this is
  // identical to `fields`. When playing, force centers ping-pong between
  // (fx,fy) and (targetFx,targetFy).
  const effectiveFields = useMemo(
    () => fields.map((f) => fieldAtProgress(f, progress)),
    [fields, progress],
  );

  // Recompute rows whenever fields or any global param changes. This is
  // pure synchronous JS — for 16×49 = 784 letters × ~3 fields it's well
  // under a millisecond. No need for memoization tricks.
  const rows = useMemo(
    () => buildRows(effectiveFields, globals, CANVAS_W, CANVAS_H),
    [effectiveFields, globals],
  );

  // Group letters by wordKey for blob rendering. Each entry maps to one
  // gooey-filtered <g> in the SVG: rectangles per letter merge into a
  // single colored blob with organic edges.
  const wordGroups = useMemo(() => {
    if (!globals.wordBackgrounds) return [] as Array<{ key: string; wordIdx: number; letters: Letter[] }>;
    const map = new Map<string, { key: string; wordIdx: number; letters: Letter[] }>();
    for (const row of rows) {
      for (const letter of row) {
        if (letter.wordKey == null || letter.wordIdx == null) continue;
        let group = map.get(letter.wordKey);
        if (!group) {
          group = { key: letter.wordKey, wordIdx: letter.wordIdx, letters: [] };
          map.set(letter.wordKey, group);
        }
        group.letters.push(letter);
      }
    }
    return Array.from(map.values());
  }, [rows, globals.wordBackgrounds]);

  // How many distinct filter variants we generate. Each gets a different
  // turbulence seed + base frequency so adjacent words don't share an
  // identical edge pattern. Enough variety for typical poster (≤ 10 unique
  // words); cycles modulo this count beyond that.
  const FILTER_VARIANTS = 10;

  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function svgPointFromEvent(e: { clientX: number; clientY: number }) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  // Global mousemove / mouseup listeners while dragging. Each drag kind
  // updates a different subset of the field's fields:
  //   move   → cx, cy
  //   resize → sx OR sy depending on which cardinal handle was grabbed
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const { x, y } = svgPointFromEvent(e);
      const field = fields.find((f) => f.id === drag.id);
      if (!field) return;

      if (drag.kind === 'move') {
        // Translate the whole field — both shape AND force center move
        // by the same delta so their relative offset is preserved.
        const newCx = x - drag.offsetX;
        const newCy = y - drag.offsetY;
        updateField(drag.id, {
          cx: newCx,
          cy: newCy,
          fx: field.fx + (newCx - field.cx),
          fy: field.fy + (newCy - field.cy),
        });
      } else if (drag.kind === 'force') {
        // Move ONLY the force center within the shape — store will clamp
        // to the shape boundary if dragged outside.
        updateField(drag.id, { fx: x - drag.offsetX, fy: y - drag.offsetY });
      } else if (drag.kind === 'target') {
        // Move the animation target — also clamped to shape on the store side.
        updateField(drag.id, { targetFx: x - drag.offsetX, targetFy: y - drag.offsetY });
      } else {
        // resize: cardinal handles are 1D — they only change the relevant
        // radius, never the orthogonal one. This keeps the drag predictable
        // (cursor wandering off-axis doesn't pollute the other dimension).
        const patch: Partial<typeof field> = {};
        if (drag.edge === 'right' || drag.edge === 'left') {
          patch.sx = Math.max(MIN_RADIUS, Math.abs(x - field.cx));
        } else {
          patch.sy = Math.max(MIN_RADIUS, Math.abs(y - field.cy));
        }
        updateField(drag.id, patch);
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, fields, updateField]);

  return (
    <div className="flex h-full w-full items-center justify-center p-6 overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full max-h-full max-w-full shadow-2xl"
        style={{ background: globals.backgroundColor }}
      >
        {/* Per-variant gooey filters — each word index references one of
            these by `wordIdx % FILTER_VARIANTS`. Same recipe as
            gooey-poster (turbulence → displacement → blur → threshold) but
            seeds and base frequencies differ between variants so adjacent
            words don't share an identical edge pattern. */}
        <defs>
          {Array.from({ length: FILTER_VARIANTS }).map((_, i) => {
            // Prime-multiplied seed gives diverse noise patterns even for
            // small i values. baseFrequency cycles through 5 scales so
            // some words have fine-grained wobble, others have coarse.
            const seed = i * 13 + 7;
            const baseFreq = 0.014 + (i % 5) * 0.005;
            return (
              <filter key={i} id={`word-blob-${i}`} x="-15%" y="-15%" width="130%" height="130%">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency={baseFreq}
                  numOctaves={2}
                  seed={seed}
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale={globals.wordBlobWobble}
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displaced"
                />
                <feGaussianBlur in="displaced" stdDeviation={globals.wordBlobBlur} result="blur" />
                <feColorMatrix
                  in="blur"
                  mode="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
                />
              </filter>
            );
          })}
        </defs>

        {/* Word blobs: each word group becomes its own filtered <g>, with
            the filter variant chosen by wordIdx so each unique word has a
            distinct edge style. Drawn before text so glyphs render on top. */}
        {globals.wordBackgrounds && wordGroups.map((group) => {
          const color = globals.wordColors[group.wordIdx % globals.wordColors.length] ?? WORD_COLORS[0];
          const filterVariant = group.wordIdx % FILTER_VARIANTS;
          const half = globals.wordBlobSize / 2;
          return (
            <g key={group.key} filter={`url(#word-blob-${filterVariant})`} fill={color}>
              {group.letters.map((l, i) => (
                <rect
                  key={i}
                  x={l.x - half}
                  y={l.y - half}
                  width={globals.wordBlobSize}
                  height={globals.wordBlobSize}
                  rx={half / 3}
                />
              ))}
            </g>
          );
        })}

        {/* Letters — always black so they read crisply on any blob color. */}
        <g fill="#000000" fontFamily="ui-monospace, SF Mono, Menlo, monospace" fontWeight={700}>
          {rows.map((row, ri) =>
            row.map((letter, li) => (
              <text
                key={`${ri}-${li}`}
                x={letter.x}
                y={letter.y}
                fontSize={globals.letterSize}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {letter.char}
              </text>
            )),
          )}
        </g>

        {/* Field overlays — ellipse outlines, center move handle, and
            (when selected) 4 cardinal resize handles. */}
        {fields.map((f) => {
          const selected = f.id === selectedFieldId;
          const sign = f.strength >= 0 ? '+' : '−';
          const stroke = selected ? '#60a5fa' : 'rgba(255,255,255,0.35)';

          return (
            <g key={f.id} className="field-handle">
              {/* Visible dashed outline of the field. Pointer-events off so
                  it's purely cosmetic — interaction goes through the wider
                  invisible hit target below. */}
              <ellipse
                cx={f.cx}
                cy={f.cy}
                rx={f.sx}
                ry={f.sy}
                fill="none"
                stroke={stroke}
                strokeWidth={selected ? 2 : 1}
                strokeDasharray="6 6"
                pointerEvents="none"
              />

              {/* Wide invisible "hit target" stroke for grabbing the field
                  by its edge. Stroke is transparent + 24px wide → easy to
                  click without it being visually heavy. pointer-events on
                  stroke only (not the interior). */}
              <ellipse
                cx={f.cx}
                cy={f.cy}
                rx={f.sx}
                ry={f.sy}
                fill="none"
                stroke="transparent"
                strokeWidth={24}
                style={{ cursor: 'move' }}
                pointerEvents="stroke"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectField(f.id);
                  const { x, y } = svgPointFromEvent(e);
                  setDrag({ kind: 'move', id: f.id, offsetX: x - f.cx, offsetY: y - f.cy });
                }}
              />

              {/* Shape center: round move handle. Drag → translates whole
                  field (shape + force center together). */}
              <circle
                cx={f.cx}
                cy={f.cy}
                r={11}
                fill="rgba(255,255,255,0.55)"
                stroke="#0a0a0a"
                strokeWidth={1.5}
                style={{ cursor: 'move' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectField(f.id);
                  const { x, y } = svgPointFromEvent(e);
                  setDrag({ kind: 'move', id: f.id, offsetX: x - f.cx, offsetY: y - f.cy });
                }}
              />

              {/* Force center: diamond handle showing the +/− sign. Drag →
                  moves ONLY the force center within the shape. Decoupled
                  from the shape so the user can offset the field's hot spot. */}
              <g
                transform={`translate(${f.fx} ${f.fy})`}
                style={{ cursor: 'move' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectField(f.id);
                  const { x, y } = svgPointFromEvent(e);
                  setDrag({ kind: 'force', id: f.id, offsetX: x - f.fx, offsetY: y - f.fy });
                }}
              >
                <polygon
                  points="0,-14 14,0 0,14 -14,0"
                  fill={selected ? '#60a5fa' : 'rgba(255,255,255,0.5)'}
                  stroke="#0a0a0a"
                  strokeWidth={1.5}
                />
                <text
                  fontSize={14}
                  fontWeight={700}
                  fill="#0a0a0a"
                  textAnchor="middle"
                  dominantBaseline="central"
                  pointerEvents="none"
                >
                  {sign}
                </text>
              </g>

              {/* Subtle line connecting shape center to force center —
                  helps the user see the offset relationship at a glance. */}
              {selected && (f.cx !== f.fx || f.cy !== f.fy) && (
                <line
                  x1={f.cx} y1={f.cy} x2={f.fx} y2={f.fy}
                  stroke="#60a5fa" strokeWidth={1} strokeDasharray="2 3"
                  pointerEvents="none"
                />
              )}

              {/* Animation target ghost handle — shown only when selected and
                  set somewhere different from the current force center.
                  Drag to retarget, or use the "set target" button. */}
              {selected && (f.fx !== f.targetFx || f.fy !== f.targetFy) && (
                <>
                  <line
                    x1={f.fx} y1={f.fy} x2={f.targetFx} y2={f.targetFy}
                    stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                  <g
                    transform={`translate(${f.targetFx} ${f.targetFy})`}
                    style={{ cursor: 'move' }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const { x, y } = svgPointFromEvent(e);
                      setDrag({ kind: 'target', id: f.id, offsetX: x - f.targetFx, offsetY: y - f.targetFy });
                    }}
                  >
                    <polygon
                      points="0,-12 12,0 0,12 -12,0"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={2}
                    />
                  </g>
                </>
              )}

              {/* Resize handles (cardinal points). Hidden until selected to
                  keep the canvas uncluttered when many fields exist. */}
              {selected && (
                <>
                  <ResizeHandle
                    cx={f.cx + f.sx} cy={f.cy} cursor="ew-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'right' })}
                  />
                  <ResizeHandle
                    cx={f.cx - f.sx} cy={f.cy} cursor="ew-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'left' })}
                  />
                  <ResizeHandle
                    cx={f.cx} cy={f.cy + f.sy} cursor="ns-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'bottom' })}
                  />
                  <ResizeHandle
                    cx={f.cx} cy={f.cy - f.sy} cursor="ns-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'top' })}
                  />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Small square handle. Square (not circle) signals "resize" by convention,
// distinguishing it from the round center "move" handle.
function ResizeHandle({
  cx, cy, cursor, onDown,
}: {
  cx: number; cy: number; cursor: 'ew-resize' | 'ns-resize';
  onDown: () => void;
}) {
  const size = 14;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill="#60a5fa"
      stroke="#0a0a0a"
      strokeWidth={1.5}
      style={{ cursor }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
    />
  );
}

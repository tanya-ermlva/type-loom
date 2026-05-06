import { useEffect, useMemo, useRef, useState } from 'react';
import { CANVAS_H, CANVAS_W, useStore } from '../store';
import { buildCells, rasterizeToGrid } from '../dither';

type DragState =
  | { kind: 'move'; id: string; offsetX: number; offsetY: number }
  | { kind: 'resize'; id: string; edge: 'right' | 'left' | 'top' | 'bottom' }
  | { kind: 'force'; id: string; offsetX: number; offsetY: number };

const MIN_RADIUS = 20;

export function Canvas() {
  const fields = useStore((s) => s.fields);
  const globals = useStore((s) => s.globals);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const selectField = useStore((s) => s.selectField);
  const updateField = useStore((s) => s.updateField);
  const imageDataUrl = useStore((s) => s.imageDataUrl);

  // Re-rasterize the uploaded image whenever the source URL, grid size, or
  // invert flag changes. Cancellation guard prevents a stale resolved
  // promise from clobbering a fresh grid if the user fires uploads quickly.
  const [imageGrid, setImageGrid] = useState<number[][] | null>(null);
  useEffect(() => {
    if (!imageDataUrl) {
      setImageGrid(null);
      return;
    }
    let cancelled = false;
    rasterizeToGrid(imageDataUrl, globals.charCount, globals.rowCount, globals.invertImage)
      .then((g) => { if (!cancelled) setImageGrid(g); })
      .catch(() => { if (!cancelled) setImageGrid(null); });
    return () => { cancelled = true; };
  }, [imageDataUrl, globals.charCount, globals.rowCount, globals.invertImage]);

  const cells = useMemo(
    () => buildCells(fields, globals, CANVAS_W, CANVAS_H, imageGrid),
    [fields, globals, imageGrid],
  );

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

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const { x, y } = svgPointFromEvent(e);
      const field = fields.find((f) => f.id === drag.id);
      if (!field) return;
      if (drag.kind === 'move') {
        const newCx = x - drag.offsetX;
        const newCy = y - drag.offsetY;
        updateField(drag.id, {
          cx: newCx,
          cy: newCy,
          fx: field.fx + (newCx - field.cx),
          fy: field.fy + (newCy - field.cy),
        });
      } else if (drag.kind === 'force') {
        updateField(drag.id, { fx: x - drag.offsetX, fy: y - drag.offsetY });
      } else {
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
        {/* Letters: only cells the dither marked "on" render. */}
        <g
          fill={globals.letterColor}
          fontFamily="ui-monospace, SF Mono, Menlo, monospace"
          fontWeight={700}
          fontSize={globals.letterSize}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {cells.map((cell) =>
            cell.on ? (
              <text key={`${cell.r}-${cell.c}`} x={cell.x} y={cell.y}>
                {cell.char}
              </text>
            ) : null,
          )}
        </g>

        {/* Field overlays — outline + handles. Subtle so the dither stays
            the visual focus. */}
        {fields.map((f) => {
          const selected = f.id === selectedFieldId;
          const sign = f.strength >= 0 ? '+' : '−';
          const stroke = selected ? '#60a5fa' : 'rgba(255,255,255,0.25)';
          return (
            <g key={f.id} className="field-handle">
              <ellipse
                cx={f.cx} cy={f.cy} rx={f.sx} ry={f.sy}
                fill="none" stroke={stroke}
                strokeWidth={selected ? 1.5 : 1}
                strokeDasharray="6 6"
                pointerEvents="none"
              />
              <ellipse
                cx={f.cx} cy={f.cy} rx={f.sx} ry={f.sy}
                fill="none" stroke="transparent" strokeWidth={24}
                style={{ cursor: 'move' }}
                pointerEvents="stroke"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectField(f.id);
                  const { x, y } = svgPointFromEvent(e);
                  setDrag({ kind: 'move', id: f.id, offsetX: x - f.cx, offsetY: y - f.cy });
                }}
              />
              <circle
                cx={f.cx} cy={f.cy} r={11}
                fill="rgba(255,255,255,0.45)"
                stroke="#0a0a0a" strokeWidth={1.5}
                style={{ cursor: 'move' }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  selectField(f.id);
                  const { x, y } = svgPointFromEvent(e);
                  setDrag({ kind: 'move', id: f.id, offsetX: x - f.cx, offsetY: y - f.cy });
                }}
              />
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
                  points="0,-12 12,0 0,12 -12,0"
                  fill={selected ? '#60a5fa' : 'rgba(255,255,255,0.5)'}
                  stroke="#0a0a0a" strokeWidth={1.5}
                />
                <text fontSize={12} fontWeight={700} fill="#0a0a0a"
                  textAnchor="middle" dominantBaseline="central"
                  pointerEvents="none">
                  {sign}
                </text>
              </g>

              {selected && (
                <>
                  <ResizeHandle cx={f.cx + f.sx} cy={f.cy} cursor="ew-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'right' })} />
                  <ResizeHandle cx={f.cx - f.sx} cy={f.cy} cursor="ew-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'left' })} />
                  <ResizeHandle cx={f.cx} cy={f.cy + f.sy} cursor="ns-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'bottom' })} />
                  <ResizeHandle cx={f.cx} cy={f.cy - f.sy} cursor="ns-resize"
                    onDown={() => setDrag({ kind: 'resize', id: f.id, edge: 'top' })} />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ResizeHandle({
  cx, cy, cursor, onDown,
}: {
  cx: number; cy: number; cursor: 'ew-resize' | 'ns-resize'; onDown: () => void;
}) {
  return (
    <rect
      x={cx - 7} y={cy - 7} width={14} height={14}
      fill="#60a5fa" stroke="#0a0a0a" strokeWidth={1.5}
      style={{ cursor }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
    />
  );
}

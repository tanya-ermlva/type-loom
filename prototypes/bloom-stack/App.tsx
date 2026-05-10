/**
 * Bloom Stack — places 56 bloom atoms at the DFD logo positions and drives
 * each atom's growth value `g` from cursor proximity.
 *
 *   1. SVG uses the source wireframe's 1920×1080 viewBox so atom positions
 *      can be used as literal (cx, cy).
 *   2. mousemove computes the cursor in viewBox coords (via SVG.getScreenCTM)
 *      so it works correctly under preserveAspectRatio letterboxing.
 *   3. Each frame: per-atom dist → proximity (1 - dist/hoverRadius, clamped)
 *      → eased → growth value `g` → linear interp of every State-A field
 *      toward State-B.
 *   4. Render: <g> per atom, dot underneath, outline on top — same render
 *      logic as the standalone /bloom Atom but inlined here so we don't pay
 *      for 56 nested <svg> wrappers.
 */
import { useEffect, useRef, useState } from 'react';
import { useStore as useStackStore } from './store';
import { useStore as useBloomStore } from '../bloom/store';
import { easings } from '../pulse/animation';
import { getComposition } from '../bloom/compositions';
import { PrototypeNav } from '../bloom/PrototypeNav';

// ---------- Color + numeric helpers (mirrors prototypes/bloom/Atom.tsx) ----------

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hexToRgb(hex: string | undefined | null): [number, number, number] {
  if (typeof hex !== 'string') return [0, 0, 0];
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim().replace(/^#/, ''));
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ---------- Component ----------

export default function App() {
  const stateA = useBloomStore((s) => s.stateA);
  const stateB = useBloomStore((s) => s.stateB);
  const blendMode = useBloomStore((s) => s.blendMode);
  const bgColor = useBloomStore((s) => s.bgColor);

  const compositionId = useStackStore((s) => s.composition);
  const compositionGap = useStackStore((s) => s.compositionGap);
  const hoverRadius = useStackStore((s) => s.hoverRadius);
  const falloffEasing = useStackStore((s) => s.falloffEasing);

  // Resolve the composition each render — cheap. Gap reshapes the viewBox
  // and the position list together (see prototypes/bloom/compositions.ts).
  const composition = getComposition(compositionId, compositionGap);

  // Buffer zone around the content so the cursor can travel past atoms near
  // the edge and let their bloom finish, instead of snapping back to rest the
  // moment it crosses an invisible boundary. Padding is in viewBox units; the
  // SVG renders the entire padded rect (bg fills it via CSS), atoms keep
  // their original (cx, cy). 250u ≈ the default hover reach, so an edge atom
  // can stay maximally bloomed even as the cursor sits just outside the DFD.
  const PADDING = 250;
  const vbX = -PADDING;
  const vbY = -PADDING;
  const vbW = composition.viewBox.width + 2 * PADDING;
  const vbH = composition.viewBox.height + 2 * PADDING;

  // Mouse position in viewBox coords. `null` only on initial mount or when
  // the cursor leaves the browser window — atoms beyond hoverRadius compute
  // proximity → 0 anyway, so global tracking doesn't bloom anything that
  // shouldn't be bloomed; it just lets edge atoms finish their motion when
  // the cursor travels outside the visible canvas.
  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      // Project pixel coords into the SVG's viewBox space via the inverse
      // CTM. Works correctly even when the cursor is well outside the SVG
      // — the result is just viewBox coords beyond [0, vbWidth/Height].
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const local = pt.matrixTransform(ctm.inverse());
      setMouse({ x: local.x, y: local.y });
    };
    // mouseleave on document fires when the cursor exits the browser
    // viewport entirely (or the tab loses focus); we drop the cursor then
    // so atoms relax to State A.
    const onDocLeave = () => setMouse(null);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onDocLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onDocLeave);
    };
  }, []);

  // Resolve the easing curve once per render (cheap; small lookup).
  const easeFn = falloffEasing === 'cubic-bezier'
    ? easings.linear  // bezier curves need a curve param we don't pass here
    : easings[falloffEasing] ?? easings.linear;

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: '#0a0a0a', color: '#e4e4e7',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
          <PrototypeNav current="stack" />
        </div>
        <a href="../" style={{
          position: 'absolute', top: 22, right: 24, zIndex: 10,
          fontSize: 11, color: '#71717a', textDecoration: 'none',
        }}>prototypes</a>

        <svg
          ref={svgRef}
          viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
          width="100%"
          height="100%"
          style={{
            background: bgColor, display: 'block',
            maxWidth: '90vw', maxHeight: '85vh',
          }}
        >
          <g style={{ mixBlendMode: blendMode as React.CSSProperties['mixBlendMode'] }}>
            {composition.positions.map((p, i) => {
              // Per-atom growth value from cursor proximity.
              let g = 0;
              if (mouse) {
                const d = Math.hypot(p.cx - mouse.x, p.cy - mouse.y);
                const proximity = clamp01(1 - d / Math.max(1, hoverRadius));
                g = easeFn(proximity);
              }

              const dotR = lerp(stateA.dotRadius, stateB.dotRadius, g);
              const dotColor = lerpColor(stateA.dotColor, stateB.dotColor, g);
              const dotOpacity = lerp(stateA.dotOpacity, stateB.dotOpacity, g);

              const outlineR = lerp(stateA.outlineRadius, stateB.outlineRadius, g);
              const outlineW = lerp(stateA.outlineStroke, stateB.outlineStroke, g);
              const outlineColor = lerpColor(stateA.outlineColor, stateB.outlineColor, g);
              const outlineOpacity = lerp(stateA.outlineOpacity, stateB.outlineOpacity, g);

              return (
                <g key={i}>
                  {dotOpacity > 0.001 && (
                    <circle
                      cx={p.cx} cy={p.cy} r={Math.max(0, dotR)}
                      fill={dotColor} opacity={dotOpacity}
                    />
                  )}
                  {outlineOpacity > 0.001 && outlineW > 0.001 && (
                    <circle
                      cx={p.cx} cy={p.cy} r={Math.max(0, outlineR)}
                      fill="none" stroke={outlineColor}
                      strokeWidth={Math.max(0, outlineW)}
                      opacity={outlineOpacity}
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Sidebar imported from a sibling file to keep this one focused on
          the composition + interaction logic. */}
      <SidebarLazy />
    </div>
  );
}

// Tiny indirection so the import sits at the bottom and the file reads
// top-down (canvas first, controls second). Functionally identical to a
// direct import.
import { Sidebar } from './Sidebar';
function SidebarLazy() { return <Sidebar />; }

import { useEffect, useMemo, useRef, useState } from 'react';
import { Atom } from '../pulse/Atom';
import { PrototypeNav } from '../pulse/PrototypeNav';
import { easingFn } from '../pulse/animation';
import { useStore as usePulseStore, type Composition } from '../pulse/store';
import { useTokenWidths } from '../pulse/tokens';
import { useStore as useStackStore, SLOT_COUNT } from './store';
import { Sidebar } from './Sidebar';
import { ExportContext } from '../pulse/ExportContext';

/**
 * Stack — vertical infinite scroll of pulse-atoms (Phase 1.5+).
 *
 * Vertical scroll and horizontal pulse are now INDEPENDENT:
 *   - Each atom owns its own RAF (driven by composition.loopDuration).
 *     Atoms differ only by colour and a phase offset (i / atomCount) so they
 *     occupy different points in the same horizontal cycle.
 *   - Stack drives ONLY the vertical scroll RAF, on its own cycleDuration
 *     and scrollEasing. Atoms don't restart at scroll boundaries.
 */
export default function App() {
  const baseComposition = usePulseStore((s) => s.composition);
  const {
    stackCanvasWidth, stackCanvasHeight,
    cycleDuration, pulsesPerScroll, scrollEasing, scrollEasingCurve, playing, scrollEnabled,
    atomPalette, atomAlignmentOverrides, phaseMode, phaseStep, phaseSpread,
  } = useStackStore();
  // ----- Canvas-driven atom sizing -----
  // The Stack canvas is set independently (preset or custom). The Pulse atom's
  // canvasWidth × canvasHeight only define the atom's ASPECT RATIO. Inside Stack:
  //   atomDisplayWidth  = stackCanvasWidth                 (always fills width)
  //   atomDisplayHeight = stackCanvasWidth × atomAspect   (preserves Pulse's aspect)
  //   atomCount         = floor(stackCanvasH / atomDisplayHeight)
  // → tall (portrait) canvases tile many atoms; wider canvases tile fewer.
  // Typography scales naturally because each atom uses its own viewBox so all
  // canvas-space lengths (font size, gaps) shrink/grow with the display size.
  const canvas = { width: stackCanvasWidth, height: stackCanvasHeight };
  const atomAspect = baseComposition.canvasHeight / Math.max(1, baseComposition.canvasWidth);
  const atomDisplayHeight = stackCanvasWidth * atomAspect;
  const atomCount = Math.max(1, Math.floor(stackCanvasHeight / Math.max(1, atomDisplayHeight)));
  // Effective atom loopDuration in Stack = scroll cycle / pulses per scroll.
  // Atoms in Stack ignore Pulse's loopDuration so the scroll rhythm is always clean.
  const atomLoopDurationInStack = Math.max(0.05, cycleDuration / Math.max(1, pulsesPerScroll));

  // Per-atom compositions: same as pulse, with colour + phase offset overrides.
  // Each gets a unique line/token id prefix so React + useTokenWidths see stable identity.
  const atoms: Composition[] = useMemo(() => {
    // Per-atom phase delta depends on mode:
    //   • 'step'   — fixed delta between adjacent atoms (i * phaseStep).
    //   • 'spread' — divide phaseSpread evenly across (count - 1) gaps.
    const stepFromMode = (i: number): number => {
      if (phaseMode === 'step') return i * phaseStep;
      if (atomCount <= 1) return 0;
      return (i / (atomCount - 1)) * phaseSpread;
    };
    // Merge per-atom alignment overrides on top of Pulse's per-state alignment.
    const mergeAlignments = (
      base: typeof baseComposition.stateA,
      override: ReturnType<typeof getOverrideArr>,
    ) => {
      if (!override) return base;
      const merged = base.alignments.map((m, li) => override[li] ?? m);
      return { alignments: merged };
    };
    // Per-atom slots cycle every SLOT_COUNT (4): atom 0,4,8,… use slot 0;
    // atom 1,5,9,… use slot 1; etc. Both palette and alignment overrides cycle.
    const getOverrideArr = (i: number, state: 'stateA' | 'stateB' | 'stateC') =>
      atomAlignmentOverrides[i % SLOT_COUNT]?.[state];

    return Array.from({ length: atomCount }, (_, i) => {
      const palette = atomPalette[i % SLOT_COUNT] ?? atomPalette[0];
      // Reuse baseComposition.lines BY REFERENCE — same token IDs across atoms
      // means a single shared widths-measurement covers them all (computed below).
      return {
        ...baseComposition,
        blockColor: palette?.blockColor ?? baseComposition.blockColor,
        textColor: palette?.textColor ?? baseComposition.textColor,
        loopDuration: atomLoopDurationInStack,
        phaseOffset: (((baseComposition.phaseOffset ?? 0) + stepFromMode(i)) % 1 + 1) % 1,
        stateA: mergeAlignments(baseComposition.stateA, getOverrideArr(i, 'stateA')),
        stateB: mergeAlignments(baseComposition.stateB, getOverrideArr(i, 'stateB')),
        stateC: mergeAlignments(baseComposition.stateC, getOverrideArr(i, 'stateC')),
      };
    });
  }, [baseComposition, atomCount, atomPalette, atomAlignmentOverrides,
      phaseMode, phaseStep, phaseSpread, atomLoopDurationInStack]);

  // Measure widths ONCE for the shared lines/font params; pass to every atom so
  // cycle-wrap (slot composition swap) doesn't trigger a per-atom re-measure.
  const sharedLetterSpacingPx = (baseComposition.fontSize * baseComposition.letterSpacingPct) / 100;
  const sharedWidths = useTokenWidths(
    baseComposition.lines, baseComposition.fontFamily, baseComposition.fontSize, sharedLetterSpacingPx,
  );

  // atomDisplayHeight (px in stack-canvas space) is what drives slot positioning,
  // NOT the atom's own canvasHeight (which is in atom-canvas space — different units).
  // Slot count = enough to cover the canvas plus one for the scroll seam.
  const slotCount = Math.ceil(canvas.height / Math.max(1, atomDisplayHeight)) + 1;

  // ----- Scroll-only RAF (paused during export; replaced by virtual time) -----
  const scrollTickRef = useRef(0);
  const [scrollTick, setScrollTick] = useState(0);
  // Export overrides: when set, the scroll tick + per-atom RAF are replaced by
  // a virtual time derived from the frame index.
  const [exportFrame, setExportFrame] = useState<number | null>(null);
  const [exportFps, setExportFps] = useState<number>(30);
  const exporting = exportFrame !== null;
  useEffect(() => {
    if (!playing || exporting || !scrollEnabled) return;
    let raf = 0;
    const start = performance.now();
    const initialOffset = scrollTickRef.current;
    const loop = (now: number) => {
      const t = initialOffset + (now - start) / 1000;
      scrollTickRef.current = t;
      setScrollTick(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, exporting, scrollEnabled]);

  const virtualTime = exporting ? exportFrame! / exportFps : scrollTick;
  const totalCycles = virtualTime / Math.max(0.05, cycleDuration);
  const cycleIdx = Math.floor(totalCycles);
  const cycleProgress = totalCycles - cycleIdx; // 0..1 within current step

  const easedScrollT = easingFn(scrollEasing, scrollEasingCurve)(cycleProgress);
  // When scroll is disabled, freeze localScrollY at 0 — atoms keep pulsing
  // horizontally but the canvas no longer moves. Applies to both live view AND export.
  // Each cycle the canvas snaps up by exactly one atom's display height.
  const localScrollY = scrollEnabled ? easedScrollT * atomDisplayHeight : 0;

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#e4e4e7',
      overflow: 'hidden',
    }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
            <PrototypeNav current="stack" />
          </div>

          <div id="stack-canvas" data-canvas-bg={baseComposition.bgColor} style={{
            width: 'min(100%, 90vw)', maxHeight: '85vh',
            aspectRatio: `${canvas.width} / ${canvas.height}`,
            position: 'relative', overflow: 'hidden',
            background: baseComposition.bgColor,
          }}>
            {atoms.length > 0 && Array.from({ length: slotCount }, (_, slotIdx) => {
              const atomIdx = (((cycleIdx + slotIdx) % atoms.length) + atoms.length) % atoms.length;
              const atom = atoms[atomIdx];
              if (!atom) return null;
              const topPct = ((slotIdx * atomDisplayHeight - localScrollY) / canvas.height) * 100;
              const heightPct = (atomDisplayHeight / canvas.height) * 100;
              // Atom always fills the full stack canvas width — no centring needed.
              const widthPct = 100;
              // During export, override each atom's RAF with the virtual-time-
              // derived raw phase. Atom maps phase → progress internally so
              // trails lag correctly in the reverse half of ping-pong.
              const phaseOverride = exporting
                ? (virtualTime / Math.max(0.05, atom.loopDuration) + atom.phaseOffset) % 1
                : null;
              return (
                <div key={`slot-${slotIdx}`} className="stack-slot"
                  data-slot-x="0"
                  data-slot-y={`${topPct}`}
                  data-slot-w={`${widthPct}`}
                  data-slot-h={`${heightPct}`}
                  style={{
                    position: 'absolute',
                    top: `${topPct}%`,
                    left: 0,
                    width: '100%',
                    height: `${heightPct}%`,
                  }}>
                  <Atom composition={atom} playing={playing} phaseOverride={phaseOverride}
                    widthsOverride={sharedWidths} />
                </div>
              );
            })}
          </div>
        </div>
        <ExportContext.Provider value={{
          prepareFrame: (f, fps) => {
            setExportFps(fps);
            setExportFrame(f);
          },
          finishExport: () => {
            setExportFrame(null);
          },
          getSvg: () => buildStackComposite(canvas.width, canvas.height, baseComposition.bgColor),
        }}>
          <Sidebar />
        </ExportContext.Provider>
      </div>
    </div>
  );
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Build a single composite SVG from the live DOM: canvas-sized root with each
 * visible atom embedded via nested <svg> at its current y position.
 * Called per export frame to capture the full stack into one PNG.
 */
function buildStackComposite(canvasW: number, canvasH: number, bgColor: string): SVGSVGElement | null {
  const composite = document.createElementNS(SVG_NS, 'svg') as SVGSVGElement;
  composite.setAttribute('viewBox', `0 0 ${canvasW} ${canvasH}`);
  composite.setAttribute('xmlns', SVG_NS);

  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', bgColor);
  composite.appendChild(bg);

  document.querySelectorAll<HTMLElement>('.stack-slot').forEach((slot) => {
    const svg = slot.querySelector('svg');
    if (!svg) return;
    const x = parseFloat(slot.dataset.slotX ?? '0');
    const y = parseFloat(slot.dataset.slotY ?? '0');
    const w = parseFloat(slot.dataset.slotW ?? '100');
    const h = parseFloat(slot.dataset.slotH ?? '100');
    // Convert percentages back to canvas-space pixels.
    const inner = svg.cloneNode(true) as SVGSVGElement;
    inner.setAttribute('x', String((x / 100) * canvasW));
    inner.setAttribute('y', String((y / 100) * canvasH));
    inner.setAttribute('width', String((w / 100) * canvasW));
    inner.setAttribute('height', String((h / 100) * canvasH));
    composite.appendChild(inner);
  });

  return composite;
}

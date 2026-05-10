import { useEffect, useMemo, useState } from 'react';
import { Atom } from '../pulse/Atom';
import { PrototypeNav } from '../pulse/PrototypeNav';
import { easings } from '../pulse/animation';
import { useStore as usePulseStore, type Composition } from '../pulse/store';
import { useStore as useStackStore } from './store';
import { Sidebar } from './Sidebar';

/**
 * Stack — vertical infinite scroll of pulse-atoms (Phase 1.5).
 *
 * Architecture:
 * - Atom composition (alignments, font, character effects, etc.) comes LIVE
 *   from pulse store. Edit alignment in Atom view → reflects here immediately.
 * - Each atom in the stack reuses that composition with two per-instance
 *   overrides: blockColor + textColor from the stack palette, and a phase
 *   offset (i / atomCount) so atoms occupy different points in the same cycle.
 * - One cycle = `cycleDuration` seconds. Within a cycle:
 *     • Vertical scroll moves up by exactly one atomHeight (eased).
 *     • Each atom's horizontal pulse covers one full cycle (offset by phase).
 * - At cycle end: cycleIdx++ — slot[i+1]'s atom shifts into slot[i] at the
 *   same y, so the wrap is visually invisible.
 */
export default function App() {
  const baseComposition = usePulseStore((s) => s.composition);
  const {
    canvas, cycleDuration, scrollEasing, playing,
    atomCount, atomPalette,
  } = useStackStore();

  // Per-atom compositions: same as pulse, just colour-overridden. useMemo so
  // identity is stable across renders unless palette / count / source changes.
  const atoms: Composition[] = useMemo(() => {
    return Array.from({ length: atomCount }, (_, i) => {
      const palette = atomPalette[i % Math.max(1, atomPalette.length)] ?? atomPalette[0];
      return {
        ...baseComposition,
        blockColor: palette?.blockColor ?? baseComposition.blockColor,
        textColor: palette?.textColor ?? baseComposition.textColor,
        // Re-key lines/tokens per-atom so each Atom's useTokenWidths sees a stable
        // identity (not shared with other atoms or with pulse's own playground).
        lines: baseComposition.lines.map((line) => ({
          ...line,
          id: `stack${i}-${line.id}`,
          tokens: line.tokens.map((tok) => ({ ...tok, id: `stack${i}-${tok.id}` })),
        })),
      };
    });
  }, [baseComposition, atomCount, atomPalette]);

  const atomH = atoms[0]?.canvasHeight ?? 263;
  const atomW = atoms[0]?.canvasWidth ?? 1920;
  const slotCount = Math.ceil(canvas.height / atomH) + 1;

  // RAF — only runs while `playing`. When paused the current `tick` value
  // freezes, so the visible scene stays where it was when you hit Pause.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    // Resume from the current tick so pause/resume doesn't snap to time=0.
    const initialOffset = tick;
    const loop = (now: number) => {
      setTick(initialOffset + (now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const totalCycles = tick / Math.max(0.05, cycleDuration);
  const cycleIdx = Math.floor(totalCycles);
  const cycleProgress = totalCycles - cycleIdx; // 0..1 within current step

  // Vertical scroll easing — independent from each atom's internal easing.
  const easeFn = easings[scrollEasing] ?? easings.easeOutQuart;
  const easedScrollT = easeFn(cycleProgress);
  const localScrollY = easedScrollT * atomH;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#e4e4e7',
    }}>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, position: 'relative', overflow: 'hidden',
        }}>
          {/* Top-left navigation dropdown */}
          <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
            <PrototypeNav current="stack" />
          </div>

          {/* Stack canvas: aspect-ratio scaled to fit the viewport */}
          <div style={{
            width: 'min(100%, 90vw)', maxHeight: '85vh',
            aspectRatio: `${canvas.width} / ${canvas.height}`,
            position: 'relative', overflow: 'hidden',
            background: baseComposition.bgColor, // olive — atoms are see-through outside their colour bars
          }}>
            {atoms.length > 0 && Array.from({ length: slotCount }, (_, slotIdx) => {
              // Cyclic atom assignment: slot i shows atoms[(cycleIdx + i) % N]
              // After one cycle wrap, slot[0] shows what slot[1] was showing — at exactly the
              // same y because slot[0]'s offset reset to 0 while slot[1] was at y=0.
              const atomIdx = (((cycleIdx + slotIdx) % atoms.length) + atoms.length) % atoms.length;
              const atom = atoms[atomIdx];
              if (!atom) return null;
              // Per-atom phase offset — uniform across the cycle.
              const offset = atomIdx / Math.max(1, atomCount);
              const atomT = atomPhase((cycleProgress + offset) % 1, atom.direction, atom.useStateC);
              // Convert canvas-space y to viewport % so it scales with the responsive container.
              const topPct = ((slotIdx * atomH - localScrollY) / canvas.height) * 100;
              const heightPct = (atomH / canvas.height) * 100;
              const widthPct = (atomW / canvas.width) * 100;
              return (
                <div key={`slot-${slotIdx}`} style={{
                  position: 'absolute',
                  top: `${topPct}%`,
                  left: `${(100 - widthPct) / 2}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}>
                  <Atom composition={atom} t={atomT} />
                </div>
              );
            })}
          </div>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

/** Map continuous cycleProgress (0..1) to an atom's t respecting its direction. */
function atomPhase(cycleProgress: number, direction: string, useStateC: boolean): number {
  if (useStateC) return cycleProgress;
  if (direction === 'ping-pong') {
    return cycleProgress < 0.5 ? cycleProgress * 2 : (1 - cycleProgress) * 2;
  }
  return cycleProgress;
}

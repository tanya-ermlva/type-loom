import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Sidebar } from './Sidebar';
import { Atom } from './Atom';
import { PrototypeNav } from './PrototypeNav';

export default function App() {
  const composition = useStore((s) => s.composition);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);

  const { loopDuration, direction, phaseOffset, useStateC, showTValue, showStateLabel } = composition;

  // RAF loop drives a normalized progress in [0, 1].
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing) return; // pause keeps the current t
    if (direction === 'freeze-A') { setT(0); return; }
    if (direction === 'freeze-B') { setT(useStateC ? 1 / 3 : 1); return; }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const phase = (elapsed / loopDuration + phaseOffset) % 1;
      let progress: number;
      if (useStateC) {
        progress = phase;
      } else if (direction === 'ping-pong') {
        progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      } else {
        progress = phase;
      }
      setT(progress);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loopDuration, phaseOffset, direction, useStateC]);

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
            <PrototypeNav current="atom" />
          </div>

          {/* The atom itself, scaled to fit the canvas area */}
          <div style={{
            width: 'min(100%, 90vw)', maxHeight: '85vh',
            aspectRatio: `${composition.canvasWidth} / ${composition.canvasHeight}`,
          }}>
            <Atom composition={composition} t={t} debug />
          </div>

          {/* Bottom-left play/pause */}
          <button
            onClick={() => setPlaying(!playing)}
            style={{
              position: 'absolute', left: 32, bottom: 32,
              background: 'rgba(0,0,0,0.7)', color: 'white', border: 0,
              padding: '6px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
            }}
          >{playing ? '❚❚ Pause' : '▶ Play'}</button>

          {/* Bottom-right t / state readout */}
          {(showTValue || showStateLabel) && (
            <div style={{
              position: 'absolute', right: 32, bottom: 32,
              background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 16px',
              borderRadius: 6, fontSize: 16, fontFamily: 'ui-monospace, monospace',
              fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.2,
            }}>
              {showTValue && `t = ${t.toFixed(3)}`}
              {showTValue && showStateLabel && '  ·  '}
              {showStateLabel && (
                <span style={{ fontWeight: 700 }}>
                  {useStateC
                    ? (t < 0.03 || t > 0.97
                        ? 'A'
                        : Math.abs(t - 1 / 3) < 0.03
                          ? 'B'
                          : Math.abs(t - 2 / 3) < 0.03
                            ? 'C'
                            : '↔')
                    : (t < 0.05 ? 'A' : t > 0.95 ? 'B' : '↔')}
                </span>
              )}
            </div>
          )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useStore } from './store';
import { Sidebar } from './Sidebar';
import { Atom } from './Atom';
import { PrototypeNav } from './PrototypeNav';
import { ExportContext } from './ExportContext';

export default function App() {
  const composition = useStore((s) => s.composition);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  // Raw cycle phase (0..1, pre-ping-pong remap). Atom does the remap internally
  // so trails lag in real time and stay direction-correct in both halves.
  const [exportPhase, setExportPhase] = useState<number | null>(null);

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#e4e4e7',
      overflow: 'hidden', // page itself never scrolls — only Sidebar does
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

          {/* The atom itself, scaled to fit the canvas area. RAF lives inside Atom. */}
          <div style={{
            width: 'min(100%, 90vw)', maxHeight: '85vh',
            aspectRatio: `${composition.canvasWidth} / ${composition.canvasHeight}`,
          }}>
            <Atom composition={composition} playing={playing} debug
              phaseOverride={exportPhase} svgId="atom-export-target" />
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
        </div>
        <ExportContext.Provider value={{
          prepareFrame: (f, fps) => {
            // Pass raw phase only — Atom maps it through ping-pong/useStateC.
            const frameTime = f / fps;
            const phase = (frameTime / Math.max(0.05, composition.loopDuration) + composition.phaseOffset) % 1;
            setExportPhase(phase);
          },
          finishExport: () => setExportPhase(null),
          getSvg: () => document.getElementById('atom-export-target') as SVGSVGElement | null,
        }}>
          <Sidebar />
        </ExportContext.Provider>
      </div>
    </div>
  );
}

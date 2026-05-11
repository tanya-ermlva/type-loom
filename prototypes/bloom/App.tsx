/**
 * Bloom App — atom view (route 1).
 *
 * Centers a single bloom Atom in the canvas and exposes its full config in
 * the right-hand sidebar. The composition / DFD layout (route 2) will live
 * in a separate `bloom-stack` prototype that imports the Atom component
 * unchanged and supplies per-atom `g` from cursor proximity.
 */
import { useStore } from './store';
import { Atom } from './Atom';
import { Sidebar } from './Sidebar';
import { PrototypeNav } from './PrototypeNav';

export default function App() {
  const playing = useStore((s) => s.playing);
  const cycleDuration = useStore((s) => s.cycleDuration);
  const gManual = useStore((s) => s.gManual);
  const setPlaying = useStore((s) => s.setPlaying);
  const stateA = useStore((s) => s.stateA);
  const stateB = useStore((s) => s.stateB);
  const smallTransition = useStore((s) => s.smallTransition);
  const bigTransition = useStore((s) => s.bigTransition);
  const blendMode = useStore((s) => s.blendMode);
  const bgColor = useStore((s) => s.bgColor);

  return (
    <div style={{
      height: '100vh', display: 'flex', overflow: 'hidden',
      background: '#0a0a0a', color: '#e4e4e7',
    }}>
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}>
        {/* Top-left: dropdown switcher (Atom ↔ Stack). Top-right: hub link. */}
        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 10 }}>
          <PrototypeNav current="atom" />
        </div>
        <a href="../" style={{
          position: 'absolute', top: 22, right: 24, zIndex: 10,
          fontSize: 11, color: '#71717a', textDecoration: 'none',
        }}>prototypes</a>

        {/* Atom centered. Square aspect; 70% of the smaller viewport edge. */}
        <div style={{ width: 'min(70vw, 70vh)', aspectRatio: '1 / 1' }}>
          <Atom
            stateA={stateA}
            stateB={stateB}
            smallTransition={smallTransition}
            bigTransition={bigTransition}
            playing={playing}
            cycleDuration={cycleDuration}
            gOverride={playing ? null : gManual}
            blendMode={blendMode}
            bgColor={bgColor}
            size={200}
          />
        </div>

        {/* Bottom-left: play / pause toggle. */}
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            position: 'absolute', left: 32, bottom: 32,
            background: 'rgba(0,0,0,0.7)', color: 'white', border: 0,
            padding: '6px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}
        >{playing ? '❚❚ Pause' : '▶ Play'}</button>
      </div>

      <Sidebar />
    </div>
  );
}

/**
 * Stack Sidebar — Phase 1.5.
 *
 * Stack-only controls:
 *   • Scroll: cycle duration + scroll easing + play/pause
 *   • Atoms: count slider + per-atom colour rows
 *
 * Horizontal animation, alignments, character effects come from Pulse — Sidebar
 * shows a note linking to the Atom view for those.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from './store';
import type { CubicBezierCurve, EasingMode } from '../pulse/store';
import { CurveEditor } from '../pulse/CurveEditor';
import { useExportContext } from '../pulse/ExportContext';
import { exportPngSequence } from '../pulse/export';

const EASING_OPTIONS: EasingMode[] = [
  'linear',
  'easeInSine',  'easeOutSine',  'easeInOutSine',
  'easeInQuad',  'easeOutQuad',  'easeInOutQuad',
  'easeInCubic', 'easeOutCubic', 'easeInOutCubic',
  'easeInQuart', 'easeOutQuart', 'easeInOutQuart',
  'easeInQuint', 'easeOutQuint', 'easeInOutQuint',
  'easeInExpo',  'easeOutExpo',  'easeInOutExpo',
  'easeInCirc',  'easeOutCirc',  'easeInOutCirc',
  'easeInBack',  'easeOutBack',  'easeInOutBack',
  'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
  'easeInBounce', 'easeOutBounce', 'easeInOutBounce',
  'cubic-bezier',
];

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <NoteSection />
      <ScrollSection />
      <AtomsSection />
      <ExportSection />
    </aside>
  );
}

function NoteSection() {
  return (
    <div style={{
      borderBottom: '1px solid #27272a', padding: '14px 16px',
      background: 'linear-gradient(180deg, #0a0a0a 0%, #18181b 100%)',
    }}>
      <p style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.5, margin: 0 }}>
        Each atom uses the live composition from <a href="../pulse/" style={{ color: '#60a5fa', textDecoration: 'underline' }}>Atom</a>.
        Edit alignment, character effects, easing, fonts there — all atoms here update together.
        Atoms differ only by colour and phase offset.
      </p>
    </div>
  );
}

function ScrollSection() {
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const cycleDuration = useStore((s) => s.cycleDuration);
  const setCycleDuration = useStore((s) => s.setCycleDuration);
  const pulsesPerScroll = useStore((s) => s.pulsesPerScroll);
  const setPulsesPerScroll = useStore((s) => s.setPulsesPerScroll);
  const scrollEasing = useStore((s) => s.scrollEasing);
  const setScrollEasing = useStore((s) => s.setScrollEasing);
  const scrollEasingCurve = useStore((s) => s.scrollEasingCurve);
  const setScrollEasingCurve = useStore((s) => s.setScrollEasingCurve);

  const atomDurationInStack = cycleDuration / Math.max(1, pulsesPerScroll);

  return (
    <Section title="Scroll">
      <button
        onClick={() => setPlaying(!playing)}
        style={{
          width: '100%', padding: '6px', marginBottom: 8,
          background: '#27272a', color: '#e4e4e7', border: 0, borderRadius: 4, cursor: 'pointer',
        }}
      >{playing ? '❚❚ Pause' : '▶ Play'}</button>
      <Slider label="Cycle dur" value={cycleDuration} min={0.3} max={15} step={0.1}
        onChange={setCycleDuration} format={(v) => `${v.toFixed(1)}s`} />
      <Slider label="Pulses" value={pulsesPerScroll} min={1} max={8} step={1}
        onChange={setPulsesPerScroll} format={(v) => `${v.toFixed(0)} per scroll`} />
      <p style={{ fontSize: 11, color: '#a1a1aa', margin: '4px 0 6px', fontFamily: 'ui-monospace, monospace' }}>
        Scroll snaps every <b>{cycleDuration.toFixed(1)}s</b>; atom completes <b>{pulsesPerScroll}</b> pulse{pulsesPerScroll > 1 ? 's' : ''} ({atomDurationInStack.toFixed(2)}s each).
      </p>
      <Field label="Easing">
        <select value={scrollEasing}
          onChange={(e) => setScrollEasing(e.target.value as EasingMode)}
          style={selectStyle}>
          {EASING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      {scrollEasing === 'cubic-bezier' && (
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <CurveEditor value={scrollEasingCurve}
            onChange={(curve: CubicBezierCurve) => setScrollEasingCurve(curve)} />
        </div>
      )}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 0' }}>
        Scroll cycle is the primary rhythm. Atoms inside Stack tick at scroll/pulses so an integer
        number of pulses fit per snap → perfect loop. Atom's own loopDuration in{' '}
        <a href="../pulse/" style={{ color: '#60a5fa' }}>Atom</a> only affects Pulse view.
      </p>
    </Section>
  );
}

function AtomsSection() {
  const atomCount = useStore((s) => s.atomCount);
  const setAtomCount = useStore((s) => s.setAtomCount);
  const atomPalette = useStore((s) => s.atomPalette);
  const setAtomColor = useStore((s) => s.setAtomColor);
  const phaseMode = useStore((s) => s.phaseMode);
  const setPhaseMode = useStore((s) => s.setPhaseMode);
  const phaseStep = useStore((s) => s.phaseStep);
  const setPhaseStep = useStore((s) => s.setPhaseStep);
  const phaseSpread = useStore((s) => s.phaseSpread);
  const setPhaseSpread = useStore((s) => s.setPhaseSpread);

  // Effective step for the helper text below.
  const effectiveStep = phaseMode === 'step'
    ? phaseStep
    : (atomCount > 1 ? phaseSpread / (atomCount - 1) : 0);
  const effectiveSpread = (atomCount - 1) * effectiveStep;

  return (
    <Section title="Atoms">
      <Slider label="Count" value={atomCount} min={1} max={16} step={1}
        onChange={setAtomCount} format={(v) => v.toFixed(0)} />
      <Field label="Phase mode">
        <select value={phaseMode}
          onChange={(e) => setPhaseMode(e.target.value as 'step' | 'spread')}
          style={selectStyle}>
          <option value="step">Per-atom step (fixed delta between neighbours)</option>
          <option value="spread">Total spread (fixed cascade across all atoms)</option>
        </select>
      </Field>
      {phaseMode === 'step' ? (
        <Slider label="Step" value={phaseStep} min={0} max={0.5} step={0.005}
          onChange={setPhaseStep} format={(v) => `${(v * 100).toFixed(1)}%`} />
      ) : (
        <Slider label="Spread" value={phaseSpread} min={0} max={1} step={0.005}
          onChange={setPhaseSpread} format={(v) => `${(v * 100).toFixed(1)}%`} />
      )}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 8px' }}>
        With {atomCount} atoms, neighbours are {(effectiveStep * 100).toFixed(1)}% apart;
        atom {atomCount} lags atom 1 by {(effectiveSpread * 100).toFixed(1)}%.{' '}
        {phaseMode === 'step'
          ? 'Adding atoms widens the total cascade.'
          : 'Adding atoms tightens the per-atom delta — total cascade stays constant.'}
      </p>
      <div style={{ marginTop: 6, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Palette</div>
      {atomPalette.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
          opacity: i < atomCount ? 1 : 0.4,
        }}>
          <span style={{ width: 22, fontSize: 10, color: '#71717a', fontFamily: 'ui-monospace, monospace' }}>{i + 1}</span>
          <ColorChip label="bg" value={p.blockColor}
            onChange={(v) => setAtomColor(i, { blockColor: v })} />
          <ColorChip label="text" value={p.textColor}
            onChange={(v) => setAtomColor(i, { textColor: v })} />
        </div>
      ))}
    </Section>
  );
}

function ExportSection() {
  const setPlaying = useStore((s) => s.setPlaying);
  const cycleDuration = useStore((s) => s.cycleDuration);
  const ctx = useExportContext();
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);

  // Atom's loopDuration in Stack is auto-derived (cycleDuration / pulsesPerScroll),
  // so loop = exactly cycleDuration → first and last frame are identical.
  const loopSeconds = cycleDuration;
  const frames = Math.max(1, Math.round(loopSeconds * fps));

  const handleExport = async () => {
    if (!ctx) return;
    setPlaying(false);
    setProgress(0);
    try {
      await exportPngSequence({
        frames, fps, zipName: 'stack-loop.zip',
        prepareFrame: (f) => ctx.prepareFrame(f, fps),
        getSvg: ctx.getSvg,
        onProgress: (p) => setProgress(p),
      });
    } finally {
      ctx.finishExport();
      setProgress(null);
    }
  };

  return (
    <Section title="Export loop (PNG sequence)">
      <Slider label="FPS" value={fps} min={10} max={60} step={1}
        onChange={(v) => setFps(Math.round(v))} format={(v) => v.toFixed(0)} />
      <p style={{ fontSize: 11, color: '#a1a1aa', margin: '4px 0 8px', fontFamily: 'ui-monospace, monospace' }}>
        Loop = <b>{loopSeconds.toFixed(1)}s</b> → <b>{frames} frames</b> @ {fps} FPS
      </p>
      <button onClick={handleExport} disabled={progress !== null}
        style={{
          width: '100%', padding: '6px', marginTop: 4,
          background: progress !== null ? '#3f3f46' : '#27272a',
          color: '#e4e4e7', border: 0, borderRadius: 4,
          cursor: progress !== null ? 'wait' : 'pointer',
        }}>
        {progress !== null ? `Exporting… ${(progress * 100).toFixed(0)}%` : 'Export PNG loop'}
      </button>
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Captures one full perfect loop (atom × ratio = scroll cycle). First and last frame are identical — seamless when looped in After Effects / ffmpeg / Lottie.
      </p>
    </Section>
  );
}

// ---------- Reusable primitives ----------

const selectStyle: CSSProperties = {
  width: '100%', background: '#0a0a0a', color: '#e4e4e7',
  border: '1px solid #3f3f46', borderRadius: 4, padding: '4px 6px',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid #27272a', padding: '14px 16px' }}>
      <h4 style={{
        margin: '0 0 10px', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: '#71717a',
      }}>{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ width: 64, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function Slider({
  label, value, min, max, step = 1, onChange, format = (v) => v.toString(),
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ width: 64, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }} />
      <span style={{ width: 50, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        {format(value)}
      </span>
    </div>
  );
}

function ColorChip({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
      <span style={{ fontSize: 10, color: '#71717a', width: 24 }}>{label}</span>
      <input type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 24, height: 20, padding: 0, border: '1px solid #3f3f46', background: 'transparent', cursor: 'pointer' }} />
      <input type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, fontSize: 10, fontFamily: 'ui-monospace, monospace',
          background: '#0a0a0a', color: '#e4e4e7',
          border: '1px solid #3f3f46', borderRadius: 4, padding: '2px 4px',
          minWidth: 0,
        }} />
    </div>
  );
}

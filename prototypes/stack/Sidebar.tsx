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
import type { CSSProperties, ReactNode } from 'react';
import { useStore } from './store';
import type { EasingMode } from '../pulse/store';

const EASING_OPTIONS: EasingMode[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut',
  'easeOutCubic', 'easeOutQuart', 'easeOutBack',
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
  const scrollEasing = useStore((s) => s.scrollEasing);
  const setScrollEasing = useStore((s) => s.setScrollEasing);

  return (
    <Section title="Scroll">
      <button
        onClick={() => setPlaying(!playing)}
        style={{
          width: '100%', padding: '6px', marginBottom: 8,
          background: '#27272a', color: '#e4e4e7', border: 0, borderRadius: 4, cursor: 'pointer',
        }}
      >{playing ? '❚❚ Pause' : '▶ Play'}</button>
      <Slider label="Cycle dur" value={cycleDuration} min={0.5} max={10} step={0.1}
        onChange={setCycleDuration} format={(v) => `${v.toFixed(1)}s`} />
      <Field label="Easing">
        <select value={scrollEasing}
          onChange={(e) => setScrollEasing(e.target.value as EasingMode)}
          style={selectStyle}>
          {EASING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 0' }}>
        One cycle = one scroll-step up + one full horizontal pulse cycle. They share the same phase.
      </p>
    </Section>
  );
}

function AtomsSection() {
  const atomCount = useStore((s) => s.atomCount);
  const setAtomCount = useStore((s) => s.setAtomCount);
  const atomPalette = useStore((s) => s.atomPalette);
  const setAtomColor = useStore((s) => s.setAtomColor);

  return (
    <Section title="Atoms">
      <Slider label="Count" value={atomCount} min={1} max={8} step={1}
        onChange={setAtomCount} format={(v) => v.toFixed(0)} />
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 8px' }}>
        Phase offset is uniform: i ÷ count. With {atomCount} atoms each is {(100 / Math.max(1, atomCount)).toFixed(0)}% of cycle apart.
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

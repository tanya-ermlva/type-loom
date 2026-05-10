import type { CSSProperties, ReactNode } from 'react';
import { useStore } from './store';
import type { DirectionMode, EasingMode } from './store';

const EASING_OPTIONS: EasingMode[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut',
  'easeOutCubic', 'easeOutQuart', 'easeOutBack',
];
const DIRECTION_OPTIONS: DirectionMode[] = [
  'ping-pong', 'one-way', 'freeze-A', 'freeze-B',
];

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <PlaybackSection />
      <TypographySection />
    </aside>
  );
}

// ---------- Sections ----------

function PlaybackSection() {
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  return (
    <Section title="Playback">
      <button
        onClick={() => setPlaying(!playing)}
        style={{
          width: '100%', padding: '6px', marginBottom: 8,
          background: '#27272a', color: '#e4e4e7', border: 0, borderRadius: 4, cursor: 'pointer',
        }}
      >{playing ? '❚❚ Pause' : '▶ Play'}</button>
      <Slider label="Loop dur" value={c.loopDuration} min={0.3} max={10} step={0.1}
        onChange={(v) => update({ loopDuration: v })} format={(v) => `${v.toFixed(1)}s`} />
      <Field label="Easing">
        <select value={c.easing}
          onChange={(e) => update({ easing: e.target.value as EasingMode })}
          style={selectStyle}>
          {EASING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Field label="Direction">
        <select value={c.direction}
          onChange={(e) => update({ direction: e.target.value as DirectionMode })}
          style={selectStyle}>
          {DIRECTION_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <Slider label="Phase off" value={c.phaseOffset} min={0} max={1} step={0.01}
        onChange={(v) => update({ phaseOffset: v })} format={(v) => v.toFixed(2)} />
    </Section>
  );
}

function TypographySection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  return (
    <Section title="Typography">
      <Slider label="Font size" value={c.fontSize} min={60} max={200} step={1}
        onChange={(v) => update({ fontSize: v })} />
      <Slider label="Letter sp" value={c.letterSpacingPct} min={-5} max={5} step={0.1}
        onChange={(v) => update({ letterSpacingPct: v })} format={(v) => `${v.toFixed(1)}%`} />
      <Slider label="Line ht" value={c.lineHeight} min={60} max={200} step={0.5}
        onChange={(v) => update({ lineHeight: v })} />
      <Slider label="Inter gap" value={c.interLineGap} min={-20} max={60} step={1}
        onChange={(v) => update({ interLineGap: v })} />
      <Slider label="Token sp" value={c.tokenSpacingTight} min={0} max={80} step={1}
        onChange={(v) => update({ tokenSpacingTight: v })} />
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

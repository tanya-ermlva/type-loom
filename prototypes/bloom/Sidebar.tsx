/**
 * Bloom Sidebar — controls every field on State A and State B + the
 * playback / canvas options. Two `StateSection`s share the same field set
 * and are wired through `which: 'A' | 'B'` to the matching store updater.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useStore } from './store';
import type { BlendMode, CircleTransition } from './store';
import type { EasingMode } from '../pulse/store';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'difference', 'lighten', 'darken',
];

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <PlaybackSection />
      <CanvasSection />
      <StateSection which="A" />
      <StateSection which="B" />
      <TransitionSection />
      <ResetSection />
    </aside>
  );
}

const EASING_OPTIONS: Exclude<EasingMode, 'cubic-bezier'>[] = [
  'linear',
  'easeInSine',    'easeOutSine',    'easeInOutSine',
  'easeInQuad',    'easeOutQuad',    'easeInOutQuad',
  'easeInCubic',   'easeOutCubic',   'easeInOutCubic',
  'easeInQuart',   'easeOutQuart',   'easeInOutQuart',
  'easeInQuint',   'easeOutQuint',   'easeInOutQuint',
  'easeInExpo',    'easeOutExpo',    'easeInOutExpo',
  'easeInCirc',    'easeOutCirc',    'easeInOutCirc',
  'easeInBack',    'easeOutBack',    'easeInOutBack',
  'easeInElastic', 'easeOutElastic', 'easeInOutElastic',
  'easeInBounce',  'easeOutBounce',  'easeInOutBounce',
];

/**
 * Transition section — per-circle [start, end] sub-range of the bloom's g
 * plus an easing curve. Narrow ranges = fast transitions; non-overlapping
 * ranges = sequenced handoff (small fully shrinks before big grows).
 *
 * Exported so the bloom-stack sidebar can reuse the exact same widget —
 * atom config is shared between the two views.
 */
export function TransitionSection() {
  const smallTransition = useStore((s) => s.smallTransition);
  const bigTransition = useStore((s) => s.bigTransition);
  const updateSmall = useStore((s) => s.updateSmallTransition);
  const updateBig = useStore((s) => s.updateBigTransition);

  return (
    <Section title="Transition" subtitle="speed + easing per circle">
      <CircleTransitionControls
        label="Small · on top"
        transition={smallTransition}
        update={updateSmall}
      />
      <CircleTransitionControls
        label="Big · behind"
        transition={bigTransition}
        update={updateBig}
      />
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Each circle interpolates A → B inside its own [Start, End] window
        of the bloom's g. Narrower window = faster. Set Small End = Big
        Start (e.g. both 0.5) for a clean sequential handoff.
      </p>
    </Section>
  );
}

function CircleTransitionControls({ label, transition, update }: {
  label: string;
  transition: CircleTransition;
  update: (patch: Partial<CircleTransition>) => void;
}) {
  // Keep start ≤ end automatically — the renderer treats start ≥ end as a
  // step function, which is rarely what the user wants when dragging.
  const onStartChange = (v: number) => {
    update({ start: v, end: Math.max(v, transition.end) });
  };
  const onEndChange = (v: number) => {
    update({ end: v, start: Math.min(v, transition.start) });
  };

  return (
    <>
      <SubLabel>{label}</SubLabel>
      <Slider label="Start" value={transition.start} min={0} max={1} step={0.01}
        onChange={onStartChange} format={(v) => v.toFixed(2)} />
      <Slider label="End" value={transition.end} min={0} max={1} step={0.01}
        onChange={onEndChange} format={(v) => v.toFixed(2)} />
      <Field label="Easing">
        <select value={transition.easing}
          onChange={(e) => update({ easing: e.target.value as EasingMode })}
          style={selectStyle}>
          {EASING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
    </>
  );
}

// ---------- Sections ----------

function PlaybackSection() {
  const playing = useStore((s) => s.playing);
  const cycleDuration = useStore((s) => s.cycleDuration);
  const gManual = useStore((s) => s.gManual);
  const setPlaying = useStore((s) => s.setPlaying);
  const setCycleDuration = useStore((s) => s.setCycleDuration);
  const setGManual = useStore((s) => s.setGManual);

  return (
    <Section title="Playback">
      <button
        onClick={() => setPlaying(!playing)}
        style={{
          width: '100%', padding: '6px', marginBottom: 8,
          background: '#27272a', color: '#e4e4e7',
          border: 0, borderRadius: 4, cursor: 'pointer',
        }}
      >{playing ? '❚❚ Pause' : '▶ Play'}</button>
      <Slider label="Cycle dur" value={cycleDuration} min={0.2} max={6} step={0.1}
        onChange={setCycleDuration} format={(v) => `${v.toFixed(1)}s`} />
      {!playing && (
        <Slider label="g (manual)" value={gManual} min={0} max={1} step={0.01}
          onChange={setGManual} format={(v) => v.toFixed(2)} />
      )}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Auto-loops A → B → A while playing. Pause to scrub `g` by hand and
        inspect intermediate frames.
      </p>
    </Section>
  );
}

function CanvasSection() {
  const bgColor = useStore((s) => s.bgColor);
  const blendMode = useStore((s) => s.blendMode);
  const setBgColor = useStore((s) => s.setBgColor);
  const setBlendMode = useStore((s) => s.setBlendMode);

  return (
    <Section title="Canvas">
      <ColorRow label="Background" value={bgColor} onChange={setBgColor} />
      <Field label="Blend mode">
        <select value={blendMode}
          onChange={(e) => setBlendMode(e.target.value as BlendMode)}
          style={selectStyle}>
          {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
    </Section>
  );
}

export function StateSection({ which }: { which: 'A' | 'B' }) {
  const state = useStore((s) => (which === 'A' ? s.stateA : s.stateB));
  const update = useStore((s) => (which === 'A' ? s.updateStateA : s.updateStateB));
  const subtitle = which === 'A'
    ? 'rest — what you see at g = 0'
    : 'active — what you see at g = 1';

  const cascadeHint = which === 'A'
    ? 'Editing colors here also updates State B.'
    : 'Editing colors here is independent — State A is left alone.';

  return (
    <Section title={`State ${which}`} subtitle={subtitle}>
      <SubLabel>Small · on top</SubLabel>
      <Slider label="Radius" value={state.smallRadius} min={0} max={60} step={0.5}
        onChange={(v) => update({ smallRadius: v })} format={(v) => v.toFixed(1)} />
      <ColorRow label="Color" value={state.smallColor}
        onChange={(v) => update({ smallColor: v })} />
      <Slider label="Opacity" value={state.smallOpacity} min={0} max={1} step={0.01}
        onChange={(v) => update({ smallOpacity: v })} format={(v) => v.toFixed(2)} />

      <SubLabel>Big · behind</SubLabel>
      <Slider label="Radius" value={state.bigRadius} min={0} max={100} step={0.5}
        onChange={(v) => update({ bigRadius: v })} format={(v) => v.toFixed(1)} />
      <ColorRow label="Color" value={state.bigColor}
        onChange={(v) => update({ bigColor: v })} />
      <Slider label="Opacity" value={state.bigOpacity} min={0} max={1} step={0.01}
        onChange={(v) => update({ bigOpacity: v })} format={(v) => v.toFixed(2)} />
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        {cascadeHint} Typical pattern: rest = small visible (big radius 0),
        active = big visible (small radius 0). The big sits behind the small
        so it grows out from underneath.
      </p>
    </Section>
  );
}

function ResetSection() {
  const reset = useStore((s) => s.reset);
  return (
    <Section title="Reset">
      <button onClick={() => reset()} style={{
        width: '100%', padding: '6px',
        background: '#27272a', color: '#f87171',
        border: 0, borderRadius: 4, cursor: 'pointer',
      }}>Restore defaults</button>
    </Section>
  );
}

// ---------- Layout helpers (also used by bloom-stack/Sidebar) ----------

export function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: ReactNode;
}) {
  return (
    <div style={{ borderBottom: '1px solid #27272a', padding: '12px 14px' }}>
      <div style={{
        color: '#a1a1aa', fontSize: 10, textTransform: 'uppercase',
        letterSpacing: '0.06em', marginBottom: subtitle ? 2 : 8,
      }}>{title}</div>
      {subtitle && (
        <div style={{ color: '#71717a', fontSize: 10, marginBottom: 8 }}>{subtitle}</div>
      )}
      {children}
    </div>
  );
}

export function SubLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      color: '#71717a', fontSize: 10, marginTop: 8, marginBottom: 4,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ color: '#a1a1aa', fontSize: 11, marginBottom: 3 }}>{label}</div>
      {children}
    </div>
  );
}

/**
 * Pulse-style colour row: fixed-width label · 32×22 swatch · hex text input.
 * Both swatch and text input drive the same onChange, so editing either
 * updates the other. Used here in bloom + bloom-stack so the colour-editing
 * UI stays consistent across the prototype family.
 */
export function ColorRow({
  label, value, onChange, labelWidth = 64,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labelWidth?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ width: labelWidth, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <input type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 32, height: 22, padding: 0,
          border: '1px solid #3f3f46', background: 'transparent', cursor: 'pointer',
        }} />
      <input type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, fontSize: 11, fontFamily: 'ui-monospace, monospace',
          background: '#0a0a0a', color: '#e4e4e7',
          border: '1px solid #3f3f46', borderRadius: 4, padding: '3px 6px',
        }} />
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        color: '#a1a1aa', fontSize: 11, marginBottom: 3,
      }}>
        <span>{label}</span><span>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#60a5fa' }} />
    </div>
  );
}

export const selectStyle: CSSProperties = {
  width: '100%', background: '#0a0a0a', color: '#e4e4e7',
  border: '1px solid #3f3f46', borderRadius: 4, padding: '4px 6px', fontSize: 11,
};

export const colorInputStyle: CSSProperties = {
  width: '100%', height: 28, background: '#0a0a0a',
  border: '1px solid #3f3f46', borderRadius: 4, padding: 2,
};

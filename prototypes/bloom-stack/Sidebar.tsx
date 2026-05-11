/**
 * Bloom-Stack Sidebar — composition-level controls (hover radius, falloff
 * easing, canvas) plus the State A / State B controls reused verbatim from
 * the bloom atom sidebar. The reuse means tweaking a state in either route
 * updates the same shared atom store, so the look stays consistent.
 */
import type { CSSProperties } from 'react';
import { useStore as useStackStore } from './store';
import { useStore as useBloomStore } from '../bloom/store';
import {
  Section, Slider, Field, ColorRow, StateSection, TransitionSection, selectStyle,
} from '../bloom/Sidebar';
import type { BlendMode } from '../bloom/store';
import type { FalloffKind } from './store';
import {
  COMPOSITION_IDS, getComposition, getCompositionMeta, type CompositionId,
} from '../bloom/compositions';
import type { Letter } from '../bloom/positions';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'difference', 'lighten', 'darken',
];

const FALLOFF_OPTIONS: { value: FalloffKind; label: string }[] = [
  { value: 'linear',       label: 'Linear · hard taper' },
  { value: 'smoothstep',   label: 'Smoothstep · S-curve' },
  { value: 'smootherstep', label: 'Smootherstep · flatter ends' },
  { value: 'gaussian',     label: 'Gaussian · tight peak, soft tail' },
  { value: 'constant',     label: 'Constant · plateau then cliff' },
];

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <CompositionSection />
      <HoverSection />
      <CanvasSection />
      <StateSection which="A" />
      <StateSection which="B" />
      <TransitionSection />
      <LetterPalettesSection />
      <ResetSection />
    </aside>
  );
}

// ---------- Sections ----------

function CompositionSection() {
  const composition = useStackStore((s) => s.composition);
  const compositionGap = useStackStore((s) => s.snapshots[s.composition].compositionGap);
  const setComposition = useStackStore((s) => s.setComposition);
  const setCompositionGap = useStackStore((s) => s.setCompositionGap);

  const meta = getCompositionMeta(composition);
  const active = getComposition(composition, compositionGap);

  // Switching composition just changes which snapshot is active — the
  // store keeps per-layout reach + gap, so the user's tuning is preserved
  // when they come back to a layout they've already visited.
  const onChange = (id: CompositionId) => {
    setComposition(id);
  };

  // Different gap-slider ranges per composition: stack tolerates more
  // generous gaps because it grows in only one direction; grid amplifies
  // gaps in both axes so we cap tighter to keep atoms visible on-screen.
  const gapMax = composition === 'grid-3x5' ? 600 : 1200;

  return (
    <Section title="Composition" subtitle={`${active.positions.length} atoms`}>
      <Field label="Layout">
        <select value={composition}
          onChange={(e) => onChange(e.target.value as CompositionId)}
          style={selectStyle}>
          {COMPOSITION_IDS.map((id) => {
            const m = getCompositionMeta(id);
            return <option key={id} value={id}>{m.label}</option>;
          })}
        </select>
      </Field>
      {meta.usesGap && (
        <Slider
          label={composition === 'triple-stack' ? 'Stack gap' : 'Grid gap'}
          value={compositionGap} min={0} max={gapMax} step={10}
          onChange={setCompositionGap}
          format={(v) => `${Math.round(v)}u`} />
      )}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 0' }}>
        Gap is empty space between adjacent DFD content boxes. 0 = boxes
        touch (tight); higher = more breathing room. Bigger gaps grow the
        canvas; the SVG scales to fit so atoms appear smaller on screen.
      </p>
    </Section>
  );
}

function HoverSection() {
  // Reach values follow the active composition via its snapshot, so the
  // user's tuning per layout is preserved when switching back and forth.
  const reachX = useStackStore((s) => s.snapshots[s.composition].reachX);
  const reachY = useStackStore((s) => s.snapshots[s.composition].reachY);
  const fieldFalloff = useStackStore((s) => s.fieldFalloff);
  const setReachX = useStackStore((s) => s.setReachX);
  const setReachY = useStackStore((s) => s.setReachY);
  const setFieldFalloff = useStackStore((s) => s.setFieldFalloff);

  return (
    <Section title="Hover field" subtitle="cursor is an elliptical force field">
      <Slider label="Reach X" value={reachX} min={50} max={1500} step={10}
        onChange={setReachX} format={(v) => `${Math.round(v)}u`} />
      <Slider label="Reach Y" value={reachY} min={50} max={1500} step={10}
        onChange={setReachY} format={(v) => `${Math.round(v)}u`} />
      <Field label="Falloff">
        <select value={fieldFalloff}
          onChange={(e) => setFieldFalloff(e.target.value as FalloffKind)}
          style={selectStyle}>
          {FALLOFF_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Atoms read field strength at their position: full bloom at the cursor,
        zero past the ellipse edge. Reach X ≠ Reach Y stretches the field
        into a horizontal or vertical band.
      </p>
    </Section>
  );
}

function CanvasSection() {
  const bgColor = useBloomStore((s) => s.bgColor);
  const blendMode = useBloomStore((s) => s.blendMode);
  const setBgColor = useBloomStore((s) => s.setBgColor);
  const setBlendMode = useBloomStore((s) => s.setBlendMode);

  return (
    <Section title="Canvas" subtitle="shared with /bloom atom view">
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

const LETTERS: Letter[] = ['D1', 'F', 'D2'];

function LetterPalettesSection() {
  return (
    <Section
      title="Letter palettes"
      subtitle="override colours per letter (D1, F, D2)"
    >
      {LETTERS.map((letter) => (
        <LetterRow key={letter} letter={letter} />
      ))}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '4px 0 0' }}>
        Override colours replace BOTH State A and State B for that letter.
        Click × to revert a colour to the global value. Inheriting colours
        update live when you edit the State sections above.
      </p>
    </Section>
  );
}

function LetterRow({ letter }: { letter: Letter }) {
  const override = useStackStore((s) => s.letterOverrides[letter]);
  const setLetterOverride = useStackStore((s) => s.setLetterOverride);
  const clearLetterOverride = useStackStore((s) => s.clearLetterOverride);

  // Inherited values come from the shared atom config's State A — A is the
  // master of the colour cascade, so it's the right "source of truth" to
  // show as the inherited preview.
  const inheritedSmall = useBloomStore((s) => s.stateA.smallColor);
  const inheritedBig = useBloomStore((s) => s.stateA.bigColor);

  const effectiveSmall = override.smallColor ?? inheritedSmall;
  const effectiveBig = override.bigColor ?? inheritedBig;
  const anyOverridden = override.smallColor !== null || override.bigColor !== null;

  return (
    <div style={letterRowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {/* Visual preview — big circle BEHIND, small circle on top.
            Matches the atom render order so the swatch reads correctly. */}
        <svg width="22" height="22" viewBox="0 0 22 22" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="9" fill={effectiveBig} />
          <circle cx="11" cy="11" r="4" fill={effectiveSmall} />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{letter}</span>
        <button
          onClick={() => clearLetterOverride(letter)}
          disabled={!anyOverridden}
          title={anyOverridden ? 'revert this letter to global colours' : 'no overrides set'}
          style={{
            ...resetBtnStyle,
            marginLeft: 'auto',
            opacity: anyOverridden ? 1 : 0.3,
            cursor: anyOverridden ? 'pointer' : 'default',
          }}
        >reset</button>
      </div>
      <LetterColorField
        label="Small"
        value={effectiveSmall}
        isInherited={override.smallColor === null}
        onChange={(v) => setLetterOverride(letter, { smallColor: v })}
        onInherit={() => setLetterOverride(letter, { smallColor: null })}
      />
      <LetterColorField
        label="Big"
        value={effectiveBig}
        isInherited={override.bigColor === null}
        onChange={(v) => setLetterOverride(letter, { bigColor: v })}
        onInherit={() => setLetterOverride(letter, { bigColor: null })}
      />
    </div>
  );
}

/**
 * Letter-override colour field — same pulse-style "label · swatch · hex"
 * pattern as the shared ColorRow, but with two extras specific to overrides:
 *   1. swatch + text input use a blue border when explicitly overridden,
 *      grey when inheriting global, so the row's status is visible at a glance
 *   2. a × button on the right reverts that one field back to inherit
 */
function LetterColorField({ label, value, isInherited, onChange, onInherit }: {
  label: string;
  value: string;
  isInherited: boolean;
  onChange: (v: string) => void;
  onInherit: () => void;
}) {
  const borderColor = isInherited ? '#3f3f46' : '#60a5fa';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ width: 48, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <input type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 32, height: 22, padding: 0,
          border: `1px solid ${borderColor}`,
          background: 'transparent', cursor: 'pointer',
        }} />
      <input type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, fontSize: 11, fontFamily: 'ui-monospace, monospace',
          background: '#0a0a0a', color: '#e4e4e7',
          border: `1px solid ${borderColor}`,
          borderRadius: 4, padding: '3px 6px',
        }} />
      <button
        onClick={onInherit}
        disabled={isInherited}
        title={isInherited ? 'inheriting global' : 'revert to global'}
        style={{
          ...microBtnStyle,
          opacity: isInherited ? 0.25 : 1,
          cursor: isInherited ? 'default' : 'pointer',
        }}
      >×</button>
    </div>
  );
}

const letterRowStyle: CSSProperties = {
  padding: '8px 8px 6px',
  marginBottom: 6,
  background: '#0a0a0a',
  border: '1px solid #27272a',
  borderRadius: 4,
};

const resetBtnStyle: CSSProperties = {
  padding: '2px 6px',
  fontSize: 10,
  background: '#27272a',
  color: '#a1a1aa',
  border: 0,
  borderRadius: 3,
};

const microBtnStyle: CSSProperties = {
  width: 20, height: 20,
  padding: 0,
  fontSize: 12, lineHeight: 1,
  background: '#27272a',
  color: '#e4e4e7',
  border: 0,
  borderRadius: 3,
};

function ResetSection() {
  const resetStack = useStackStore((s) => s.reset);
  const resetBloom = useBloomStore((s) => s.reset);
  return (
    <Section title="Reset">
      <button
        onClick={() => { resetStack(); resetBloom(); }}
        style={{
          width: '100%', padding: '6px',
          background: '#27272a', color: '#f87171',
          border: 0, borderRadius: 4, cursor: 'pointer',
        }}
      >Restore defaults (atom + composition)</button>
    </Section>
  );
}

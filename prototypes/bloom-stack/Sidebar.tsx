/**
 * Bloom-Stack Sidebar — composition-level controls (hover radius, falloff
 * easing, canvas) plus the State A / State B controls reused verbatim from
 * the bloom atom sidebar. The reuse means tweaking a state in either route
 * updates the same shared atom store, so the look stays consistent.
 */
import { useStore as useStackStore } from './store';
import { useStore as useBloomStore } from '../bloom/store';
import {
  Section, Slider, Field, StateSection, selectStyle, colorInputStyle,
} from '../bloom/Sidebar';
import type { BlendMode } from '../bloom/store';
import type { EasingMode } from '../pulse/store';
import {
  COMPOSITION_IDS, getComposition, getCompositionMeta, type CompositionId,
} from '../bloom/compositions';

const BLEND_MODES: BlendMode[] = [
  'normal', 'multiply', 'screen', 'overlay',
  'difference', 'lighten', 'darken',
];

// Subset of pulse's full easing list — bezier requires a curve param the
// stack doesn't expose yet, so it's omitted from this dropdown.
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
      <ResetSection />
    </aside>
  );
}

// ---------- Sections ----------

function CompositionSection() {
  const composition = useStackStore((s) => s.composition);
  const compositionGap = useStackStore((s) => s.compositionGap);
  const setComposition = useStackStore((s) => s.setComposition);
  const setCompositionGap = useStackStore((s) => s.setCompositionGap);
  const setHoverRadius = useStackStore((s) => s.setHoverRadius);

  const meta = getCompositionMeta(composition);
  const active = getComposition(composition, compositionGap);

  // Switching composition seeds sensible hoverRadius + gap for the new
  // layout. Grid defaults to a smaller reach so each cluster blooms
  // independently; stack defaults to a moderate gap. User can tweak after.
  const onChange = (id: CompositionId) => {
    const m = getCompositionMeta(id);
    setComposition(id);
    setHoverRadius(m.defaultHoverRadius);
    setCompositionGap(m.defaultGap);
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
  const hoverRadius = useStackStore((s) => s.hoverRadius);
  const falloffEasing = useStackStore((s) => s.falloffEasing);
  const setHoverRadius = useStackStore((s) => s.setHoverRadius);
  const setFalloffEasing = useStackStore((s) => s.setFalloffEasing);

  return (
    <Section title="Hover" subtitle="how the cursor drives growth">
      <Slider label="Radius" value={hoverRadius} min={50} max={1500} step={10}
        onChange={setHoverRadius} format={(v) => `${Math.round(v)}u`} />
      <Field label="Falloff easing">
        <select value={falloffEasing}
          onChange={(e) => setFalloffEasing(e.target.value as EasingMode)}
          style={selectStyle}>
          {EASING_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </Field>
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Each atom's growth value g = ease(1 − dist / radius), clamped to [0, 1].
        Radius is in source-SVG (1920×1080) units — one grid cell ≈ 96.
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
      <Field label="Background">
        <input type="color" value={bgColor}
          onChange={(e) => setBgColor(e.target.value)}
          style={colorInputStyle} />
      </Field>
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

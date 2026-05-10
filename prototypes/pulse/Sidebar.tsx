import type { CSSProperties, ReactNode } from 'react';
import { useStore } from './store';
import type { AlignmentMode, BgFillMode, CharacterEffect, DirectionMode, EasingMode } from './store';

const EASING_OPTIONS: EasingMode[] = [
  'linear', 'easeIn', 'easeOut', 'easeInOut',
  'easeOutCubic', 'easeOutQuart', 'easeOutBack',
];
const DIRECTION_OPTIONS: DirectionMode[] = [
  'ping-pong', 'one-way', 'freeze-A', 'freeze-B',
];
const ALIGNMENT_OPTIONS: AlignmentMode[] = [
  'left', 'right', 'centered', 'justified',
  'stretched', 'gravity-left', 'gravity-right', 'hugging-edges',
  'scattered', 'mirrored', 'offset-justified', 'exploded',
];

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <PlaybackSection />
      <TypographySection />
      <LayoutSection />
      <AnimationCharacterSection />
      <CharacterAnimationSection />
      <RandomSection />
      <ColorsSection />
      <TextSection />
      <DebugSection />
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

function LayoutSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  const setStateAlignment = (state: 'stateA' | 'stateB' | 'stateC', lineIdx: number, mode: AlignmentMode) => {
    const next = c[state].alignments.slice();
    next[lineIdx] = mode;
    update({ [state]: { alignments: next } } as Partial<typeof c>);
  };

  const setBgFillMode = (lineIdx: number, mode: BgFillMode) => {
    const next = (c.bgBoundsModes ?? []).slice();
    next[lineIdx] = mode;
    update({ bgBoundsModes: next });
  };

  return (
    <Section title="Layout">
      <Slider label="Edge pad" value={c.edgePadding} min={0} max={200} step={1}
        onChange={(v) => update({ edgePadding: v })} />
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>BG fill (per line)</div>
      {c.lines.map((_, li) => (
        <Field key={`bg-${li}`} label={`Line ${li + 1}`}>
          <select value={c.bgBoundsModes?.[li] ?? 'continuous'}
            onChange={(e) => setBgFillMode(li, e.target.value as BgFillMode)}
            style={selectStyle}>
            <option value="continuous">continuous</option>
            <option value="per-token">per-token</option>
          </select>
        </Field>
      ))}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.5, margin: '10px 0 6px' }}>
        Animation interpolates each token's x-position between <b style={{ color: '#a1a1aa' }}>State A</b> (rest)
        and <b style={{ color: '#a1a1aa' }}>State B</b> (extended) and back. Each line picks its own
        alignment per state — try `centered ↔ justified` for a stretching ribbon, or
        `right ↔ left` for a swipe across.
      </p>
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>State A alignments</div>
      {c.lines.map((_, li) => (
        <Field key={`a-${li}`} label={`Line ${li + 1}`}>
          <select value={c.stateA.alignments[li] ?? 'centered'}
            onChange={(e) => setStateAlignment('stateA', li, e.target.value as AlignmentMode)}
            style={selectStyle}>
            {ALIGNMENT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      ))}
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>State B alignments</div>
      {c.lines.map((_, li) => (
        <Field key={`b-${li}`} label={`Line ${li + 1}`}>
          <select value={c.stateB.alignments[li] ?? 'centered'}
            onChange={(e) => setStateAlignment('stateB', li, e.target.value as AlignmentMode)}
            style={selectStyle}>
            {ALIGNMENT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
      ))}
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginTop: 10, marginBottom: 4, cursor: 'pointer', fontSize: 11,
      }}>
        <input type="checkbox" checked={!!c.useStateC}
          onChange={(e) => update({ useStateC: e.target.checked })} />
        <span>Add State C (cycle becomes A → B → C → A)</span>
      </label>
      {c.useStateC && (
        <>
          <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>State C alignments</div>
          {c.lines.map((_, li) => (
            <Field key={`c-${li}`} label={`Line ${li + 1}`}>
              <select value={c.stateC?.alignments[li] ?? 'centered'}
                onChange={(e) => setStateAlignment('stateC', li, e.target.value as AlignmentMode)}
                style={selectStyle}>
                {ALIGNMENT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          ))}
          <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.5, margin: '4px 0 6px' }}>
            With State C on, the cycle is forward-only (A → B → C → A); ping-pong vs
            one-way directions don't apply. Freeze-A pins to A, Freeze-B pins to B —
            to inspect C, pause and slide <b style={{ color: '#a1a1aa' }}>Phase off</b>{' '}
            to ~0.67.
          </p>
        </>
      )}
      <div style={{ marginTop: 10 }}>
        <Slider label="Canvas W" value={c.canvasWidth} min={1200} max={2400} step={10}
          onChange={(v) => update({ canvasWidth: v })} />
        <Slider label="Canvas H" value={c.canvasHeight} min={160} max={600} step={1}
          onChange={(v) => update({ canvasHeight: v })} />
      </div>
    </Section>
  );
}

function AnimationCharacterSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  return (
    <Section title="Animation character">
      <Slider label="Stagger" value={c.perTokenStagger} min={0} max={0.5} step={0.01}
        onChange={(v) => update({ perTokenStagger: v })} format={(v) => v.toFixed(2)} />
      <Slider label="Line off" value={c.perLineOffset} min={0} max={1} step={0.01}
        onChange={(v) => update({ perLineOffset: v })} format={(v) => v.toFixed(2)} />
      <Slider label="Bg lag" value={c.bgLag} min={0} max={0.3} step={0.01}
        onChange={(v) => update({ bgLag: v })} format={(v) => v.toFixed(2)} />
    </Section>
  );
}

const CHARACTER_EFFECT_OPTIONS: CharacterEffect[] = ['none', 'bow', 'fan', 'stretch', 'wave'];

function CharacterAnimationSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  return (
    <Section title="Character animation">
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
        cursor: 'pointer', fontSize: 11,
      }}>
        <input type="checkbox" checked={!!c.characterStaggerEnabled}
          onChange={(e) => update({ characterStaggerEnabled: e.target.checked })} />
        <span>Enable per-character animation</span>
      </label>
      {c.characterStaggerEnabled && (
        <>
          <Field label="Effect">
            <select value={c.characterEffect ?? 'bow'}
              onChange={(e) => update({ characterEffect: e.target.value as CharacterEffect })}
              style={selectStyle}>
              {CHARACTER_EFFECT_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Slider label="Char stagger" value={c.characterStagger ?? 0} min={0} max={0.5} step={0.01}
            onChange={(v) => update({ characterStagger: v })} format={(v) => v.toFixed(2)} />
          <Slider label="Amplitude" value={c.characterAmplitude ?? 0} min={0} max={120} step={1}
            onChange={(v) => update({ characterAmplitude: v })} />
          <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.5, margin: '6px 0 0' }}>
            Each character runs its own staggered window inside the token. Effect grows
            and returns to neutral via a sine envelope per window.{' '}
            <b style={{ color: '#a1a1aa' }}>bow</b> = arc up,{' '}
            <b style={{ color: '#a1a1aa' }}>fan</b> = rotate around centre,{' '}
            <b style={{ color: '#a1a1aa' }}>stretch</b> = scaleY (amplitude is %),{' '}
            <b style={{ color: '#a1a1aa' }}>wave</b> = traveling sine on y.
          </p>
        </>
      )}
    </Section>
  );
}

function RandomSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);
  const reseed = useStore((s) => s.reseedJitter);

  return (
    <Section title="Random">
      <Slider label="X jitter" value={c.jitterX} min={0} max={30} step={0.5}
        onChange={(v) => update({ jitterX: v })} />
      <Slider label="Y jitter" value={c.jitterY} min={0} max={20} step={0.5}
        onChange={(v) => update({ jitterY: v })} />
      <button onClick={reseed}
        style={{
          width: '100%', padding: '6px', marginTop: 4,
          background: '#27272a', color: '#e4e4e7', border: 0, borderRadius: 4, cursor: 'pointer',
        }}>Re-seed (#{c.jitterSeed})</button>
    </Section>
  );
}

function ColorsSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  const ColorRow = ({
    label, value, onChange,
  }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <label style={{ width: 64, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <input type="color" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 32, height: 22, padding: 0, border: '1px solid #3f3f46', background: 'transparent', cursor: 'pointer' }} />
      <input type="text" value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, fontSize: 11, fontFamily: 'ui-monospace, monospace',
          background: '#0a0a0a', color: '#e4e4e7', border: '1px solid #3f3f46',
          borderRadius: 4, padding: '3px 6px' }} />
    </div>
  );

  return (
    <Section title="Colors">
      <ColorRow label="Bg"    value={c.bgColor}    onChange={(v) => update({ bgColor: v })} />
      <ColorRow label="Block" value={c.blockColor} onChange={(v) => update({ blockColor: v })} />
      <ColorRow label="Text"  value={c.textColor}  onChange={(v) => update({ textColor: v })} />
    </Section>
  );
}

function TextSection() {
  const c = useStore((s) => s.composition);
  const setLineText = useStore((s) => s.setLineText);

  // Reconstruct text from tokens (joins with spaces; en-dash gets spaces around it).
  const textOf = (lineIdx: number) =>
    c.lines[lineIdx].tokens.map((t) => t.text).join(' ');

  return (
    <Section title="Text">
      {c.lines.map((line, li) => (
        <Field key={line.id} label={`Line ${li + 1}`}>
          <input type="text"
            defaultValue={textOf(li)}
            onBlur={(e) => setLineText(li, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            style={{
              width: '100%', fontSize: 12,
              background: '#0a0a0a', color: '#e4e4e7',
              border: '1px solid #3f3f46', borderRadius: 4, padding: '4px 6px',
            }} />
        </Field>
      ))}
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Edit + blur (or press Enter) to apply. Whitespace separates words; en-dash
        (—), em-dash (–), /, |, • are extracted as separate tokens.
      </p>
    </Section>
  );
}

function DebugSection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  const Toggle = ({
    label, value, onChange,
  }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer', fontSize: 11 }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return (
    <Section title="Debug">
      <Toggle label="Show token bounds" value={c.showTokenBounds}
        onChange={(v) => update({ showTokenBounds: v })} />
      <Toggle label="Show line bounds" value={c.showLineBounds}
        onChange={(v) => update({ showLineBounds: v })} />
      <Toggle label="Show canvas grid" value={c.showCanvasGrid}
        onChange={(v) => update({ showCanvasGrid: v })} />
      <Toggle label="Show t value" value={c.showTValue}
        onChange={(v) => update({ showTValue: v })} />
      <Toggle label="Show state label" value={c.showStateLabel}
        onChange={(v) => update({ showStateLabel: v })} />
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

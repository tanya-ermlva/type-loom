import type { CSSProperties, ReactNode } from 'react';
import { useStore, ALIGNMENT_GROUPS } from './store';
import { useState } from 'react';
import type { AlignmentMode, BgFillMode, CharacterEffect, CubicBezierCurve, DirectionMode, EasingMode } from './store';
import { CurveEditor } from './CurveEditor';
import { useExportContext } from './ExportContext';
import { exportPngSequence } from './export';
import { fitTextBlock } from './autoFit';
import { ProjectSection } from '../shared/ProjectSection';

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
const DIRECTION_OPTIONS: DirectionMode[] = [
  'ping-pong', 'one-way', 'freeze-A', 'freeze-B',
];

/** Renders all alignment modes as <optgroup>-grouped <option>s. */
function AlignmentOptions() {
  return (
    <>
      {ALIGNMENT_GROUPS.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.modes.map((m) => <option key={m} value={m}>{m}</option>)}
        </optgroup>
      ))}
    </>
  );
}

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <ProjectSection Section={Section} />
      <PlaybackSection />
      <ExportSection />
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
      {c.easing === 'cubic-bezier' && (
        <div style={{ marginTop: 6, marginBottom: 8 }}>
          <CurveEditor value={c.easingCurve}
            onChange={(curve: CubicBezierCurve) => update({ easingCurve: curve })} />
        </div>
      )}
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

function ExportSection() {
  const setPlaying = useStore((s) => s.setPlaying);
  const loopDuration = useStore((s) => s.composition.loopDuration);
  const ctx = useExportContext();
  const [fps, setFps] = useState(30);
  const [progress, setProgress] = useState<number | null>(null);

  // One full loop = loopDuration seconds. Frames auto-derived.
  const frames = Math.max(1, Math.round(loopDuration * fps));

  const handleExport = async () => {
    if (!ctx) return;
    setPlaying(false);
    setProgress(0);
    const ts = stamp();
    const zipName = `pulse-${loopDuration.toFixed(1)}s-${fps}fps-${ts}.zip`;
    try {
      await exportPngSequence({
        frames, fps, zipName,
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
        Loop = <b>{loopDuration.toFixed(1)}s</b> → <b>{frames} frames</b> @ {fps} FPS
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
        Captures one full loop (atom's loopDuration) as a seamless PNG sequence. Increase loop duration in Playback section for longer exports.
      </p>
    </Section>
  );
}

function TypographySection() {
  const c = useStore((s) => s.composition);
  const update = useStore((s) => s.updateComposition);

  // Effective values when auto-fit is on. Same math the Atom uses — so the
  // displayed "raw → effective" matches what gets rendered to the canvas.
  const fit = c.autoFitVertical
    ? fitTextBlock(c.canvasHeight, c.lines.length, c.lineHeight, c.interLineGap, c.autoFitPadding)
    : null;

  return (
    <Section title="Typography">
      <Slider label="Font size" value={c.fontSize} min={60} max={200} step={1}
        onChange={(v) => update({ fontSize: v })} />
      <Slider label="Letter sp" value={c.letterSpacingPct} min={-5} max={5} step={0.1}
        onChange={(v) => update({ letterSpacingPct: v })} format={(v) => `${v.toFixed(1)}%`} />
      <Slider label="Line ht" value={c.lineHeight} min={60} max={200} step={0.5}
        onChange={(v) => update({ lineHeight: v })}
        dimmed={!!fit}
        effective={fit ? fit.lineHeight.toFixed(1) : undefined} />
      <Slider label="Inter gap" value={c.interLineGap} min={-20} max={60} step={1}
        onChange={(v) => update({ interLineGap: v })}
        dimmed={!!fit}
        effective={fit ? fit.interLineGap.toFixed(1) : undefined} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, cursor: 'pointer', fontSize: 11 }}>
        <input type="checkbox" checked={c.autoFitVertical}
          onChange={(e) => update({ autoFitVertical: e.target.checked })} />
        <span>Auto-fit vertical</span>
      </label>
      {c.autoFitVertical && (
        <Slider label="Padding" value={c.autoFitPadding * 100} min={0} max={25} step={0.5}
          onChange={(v) => update({ autoFitPadding: v / 100 })}
          format={(v) => `${v.toFixed(1)}%`} />
      )}
      <Slider label="Token sp" value={c.tokenSpacingTight} min={0} max={80} step={1}
        onChange={(v) => update({ tokenSpacingTight: v })} />
      <Slider label="Bounds X" value={c.tokenBoundsPaddingX} min={-30} max={60} step={1}
        onChange={(v) => update({ tokenBoundsPaddingX: v })}
        format={(v) => `${v} px`} />
      <Slider label="Bounds Y" value={c.tokenBoundsPaddingY} min={-30} max={60} step={1}
        onChange={(v) => update({ tokenBoundsPaddingY: v })}
        format={(v) => `${v} px`} />
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
            <AlignmentOptions />
          </select>
        </Field>
      ))}
      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>State B alignments</div>
      {c.lines.map((_, li) => (
        <Field key={`b-${li}`} label={`Line ${li + 1}`}>
          <select value={c.stateB.alignments[li] ?? 'centered'}
            onChange={(e) => setStateAlignment('stateB', li, e.target.value as AlignmentMode)}
            style={selectStyle}>
            <AlignmentOptions />
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
                <AlignmentOptions />
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

      <label style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginTop: 12, marginBottom: 4, cursor: 'pointer', fontSize: 11,
      }}>
        <input type="checkbox" checked={!!c.trailsEnabled}
          onChange={(e) => update({ trailsEnabled: e.target.checked })} />
        <span>Bg color trails</span>
      </label>
      {c.trailsEnabled && (
        <>
          <Slider label="Count" value={c.trailCount} min={1} max={8} step={1}
            onChange={(v) => update({ trailCount: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Lag step" value={c.trailLagStep} min={0.01} max={0.15} step={0.005}
            onChange={(v) => update({ trailLagStep: v })} format={(v) => `${(v * 100).toFixed(1)}%`} />
          <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
            Per-token echoes of the bg colour, sampled at earlier points on the same curve (direction-aware: token moving left → trails on right, and vice versa). Trail i uses bg colour at opacity that fades linearly from 0.9 (closest) to 0 (deepest) across Count. Each trail lags by (i+1) × step.
          </p>
        </>
      )}
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
  effective, dimmed = false,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
  /** When present, shown after the raw value as "raw → effective" (e.g. auto-fit). */
  effective?: string;
  /** Reduces opacity to signal the slider is being overridden but still draggable. */
  dimmed?: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: dimmed ? 0.55 : 1 }}>
      <label style={{ width: 64, fontSize: 11, color: '#a1a1aa' }}>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1 }} />
      <span style={{ width: effective ? 100 : 50, textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        {effective ? `${format(value)} → ${effective}` : format(value)}
      </span>
    </div>
  );
}

/** Compact timestamp `HHMMSS` for unique export filenames within a session. */
function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Stack Sidebar — Phase 2 (canvas-driven sizing).
 *
 * Stack-only controls:
 *   • Canvas: preset dropdown + custom W/H. Drives stack canvas dimensions.
 *   • Scroll: cycle duration + scroll easing + play/pause
 *   • Atoms: phase mode + per-atom palette (4 slots, cycles)
 *   • Alignment overrides: 4 slots, atoms cycle through them
 *
 * Atom display size and count derive from canvas + atom aspect ratio (see App).
 * Horizontal animation, alignments, character effects come from Pulse — Sidebar
 * shows a note linking to the Atom view for those.
 */
import { useState, type CSSProperties, type ReactNode } from 'react';
import { useStore, SLOT_COUNT, type CanvasPreset } from './store';
import { useStore as usePulseStore, ALIGNMENT_GROUPS, type AlignmentMode, type CubicBezierCurve, type EasingMode } from '../pulse/store';
import { CurveEditor } from '../pulse/CurveEditor';
import { useExportContext } from '../pulse/ExportContext';
import { exportPngSequence } from '../pulse/export';
import { ProjectSection } from '../shared/ProjectSection';

/** Renders all alignment modes as <optgroup>-grouped <option>s — same UI as Pulse. */
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

const CANVAS_PRESET_OPTIONS: { value: CanvasPreset; label: string }[] = [
  { value: 'wide',          label: 'Wide 16:9 (1920×1080)' },
  { value: 'square',        label: 'Square 1:1 (1080×1080)' },
  { value: 'portrait-3-4',  label: 'Portrait 3:4 (1080×1440)' },
  { value: 'a4-portrait',   label: 'A4 portrait (1240×1754)' },
  { value: 'a4-landscape',  label: 'A4 landscape (1754×1240)' },
  { value: 'a3-portrait',   label: 'A3 portrait (1748×2480)' },
  { value: 'a3-landscape',  label: 'A3 landscape (2480×1748)' },
  { value: 'custom',        label: 'Custom (free W × H)' },
];

/**
 * Derive how many atoms tile inside the current stack canvas, given the live
 * Pulse atom aspect ratio. Same math as Stack App.tsx — kept inline here so
 * the Sidebar can show a live count + atom display dimensions.
 */
function useDerivedAtomCount() {
  const baseComposition = usePulseStore((s) => s.composition);
  const stackCanvasWidth = useStore((s) => s.stackCanvasWidth);
  const stackCanvasHeight = useStore((s) => s.stackCanvasHeight);
  const aspect = baseComposition.canvasHeight / Math.max(1, baseComposition.canvasWidth);
  const atomDisplayHeight = stackCanvasWidth * aspect;
  const count = Math.max(1, Math.floor(stackCanvasHeight / Math.max(1, atomDisplayHeight)));
  return { count, atomDisplayHeight, atomDisplayWidth: stackCanvasWidth };
}

export function Sidebar() {
  return (
    <aside style={{
      width: 320, flexShrink: 0, borderLeft: '1px solid #27272a',
      background: '#18181b', color: '#e4e4e7', overflowY: 'auto', fontSize: 12,
    }}>
      <ProjectSection Section={Section} />
      <NoteSection />
      <CanvasSection />
      <ScrollSection />
      <AtomsSection />
      <AlignmentOverridesSection />
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
        Atoms differ only by colour and phase offset. Atom count auto-fills the canvas height
        based on the atom's aspect ratio.
      </p>
    </div>
  );
}

function CanvasSection() {
  const canvasPreset = useStore((s) => s.canvasPreset);
  const setCanvasPreset = useStore((s) => s.setCanvasPreset);
  const stackCanvasWidth = useStore((s) => s.stackCanvasWidth);
  const stackCanvasHeight = useStore((s) => s.stackCanvasHeight);
  const setCustomCanvas = useStore((s) => s.setCustomCanvas);
  const bgColor = useStore((s) => s.bgColor);
  const setBgColor = useStore((s) => s.setBgColor);
  const { count, atomDisplayHeight } = useDerivedAtomCount();

  return (
    <Section title="Canvas">
      <Field label="Preset">
        <select value={canvasPreset}
          onChange={(e) => setCanvasPreset(e.target.value as CanvasPreset)}
          style={selectStyle}>
          {CANVAS_PRESET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      {canvasPreset === 'custom' ? (
        <>
          <Slider label="Width" value={stackCanvasWidth} min={400} max={4000} step={10}
            onChange={(v) => setCustomCanvas(v, stackCanvasHeight)} format={(v) => `${v.toFixed(0)} px`} />
          <Slider label="Height" value={stackCanvasHeight} min={400} max={4000} step={10}
            onChange={(v) => setCustomCanvas(stackCanvasWidth, v)} format={(v) => `${v.toFixed(0)} px`} />
        </>
      ) : (
        <p style={{ fontSize: 11, color: '#a1a1aa', margin: '4px 0 6px', fontFamily: 'ui-monospace, monospace' }}>
          {stackCanvasWidth} × {stackCanvasHeight} ({(stackCanvasWidth / stackCanvasHeight).toFixed(2)}:1)
        </p>
      )}
      <p style={{ fontSize: 11, color: '#a1a1aa', margin: '6px 0 0', fontFamily: 'ui-monospace, monospace' }}>
        Atoms in stack: <b>{count}</b> &middot; each {stackCanvasWidth} × {Math.round(atomDisplayHeight)} px
      </p>
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Atom width = canvas width (always fills). Atom height = canvas width × atom aspect from{' '}
        <a href="../pulse/" style={{ color: '#60a5fa' }}>Atom</a>. Count = floor(canvas H ÷ atom H).
      </p>
      <div style={{ marginTop: 12, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Background
      </div>
      <ColorChip label="bg" value={bgColor} onChange={setBgColor} />
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
        Stack's own canvas background — independent of the bg in{' '}
        <a href="../pulse/" style={{ color: '#60a5fa' }}>Atom</a>.
      </p>
    </Section>
  );
}

function ScrollSection() {
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const scrollEnabled = useStore((s) => s.scrollEnabled);
  const setScrollEnabled = useStore((s) => s.setScrollEnabled);
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
      <label style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        cursor: 'pointer', fontSize: 11,
      }}>
        <input type="checkbox" checked={!!scrollEnabled}
          onChange={(e) => setScrollEnabled(e.target.checked)} />
        <span>Enable vertical scroll motion</span>
      </label>
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
  const { count } = useDerivedAtomCount();
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
    : (count > 1 ? phaseSpread / (count - 1) : 0);
  const effectiveSpread = (count - 1) * effectiveStep;

  return (
    <Section title="Atoms">
      <Field label="Phase mode">
        <select value={phaseMode}
          onChange={(e) => setPhaseMode(e.target.value as 'step' | 'spread' | 'viewport-spread')}
          style={selectStyle}>
          <option value="step">Per-atom step (fixed delta between neighbours)</option>
          <option value="spread">Total spread (cascade tied to atoms — visible seam)</option>
          <option value="viewport-spread">Viewport spread (cascade fixed in viewport — no seam)</option>
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
        With {count} atom{count > 1 ? 's' : ''}, neighbours are {(effectiveStep * 100).toFixed(1)}% apart;
        atom {count} lags atom 1 by {(effectiveSpread * 100).toFixed(1)}%.{' '}
        {phaseMode === 'step' && 'More atoms (taller canvas) widens the total cascade.'}
        {phaseMode === 'spread' && 'More atoms tightens the per-atom delta — total cascade stays constant. Cascade pattern is bound to atoms, so a visible "seam" rotates through the viewport during scroll.'}
        {phaseMode === 'viewport-spread' && 'Top slot always at phase 0, bottom always at the spread value. The cascade gradient is fixed in the viewport — atoms cycle through it as they scroll. No visible seam.'}
      </p>
      <div style={{ marginTop: 6, marginBottom: 4, fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        Palette · {SLOT_COUNT} slots, atoms cycle
      </div>
      {atomPalette.map((p, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
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

function AlignmentOverridesSection() {
  const overrides = useStore((s) => s.atomAlignmentOverrides);
  const setAtomAlignment = useStore((s) => s.setAtomAlignment);
  const resetAtomAlignments = useStore((s) => s.resetAtomAlignments);
  const atomPalette = useStore((s) => s.atomPalette);
  const useStateC = usePulseStore((s) => s.composition.useStateC);
  const lines = usePulseStore((s) => s.composition.lines);
  // Pull the live per-state base alignments so the "inherit" option can show
  // exactly which alignment will be used. Selecting individual fields (not the
  // whole composition) avoids re-rendering on every Pulse change.
  const baseStateA = usePulseStore((s) => s.composition.stateA.alignments);
  const baseStateB = usePulseStore((s) => s.composition.stateB.alignments);
  const baseStateC = usePulseStore((s) => s.composition.stateC.alignments);
  const inheritedAlignment = (
    key: 'stateA' | 'stateB' | 'stateC', li: number,
  ): AlignmentMode => {
    const arr = key === 'stateA' ? baseStateA
              : key === 'stateB' ? baseStateB
              : baseStateC;
    return (arr?.[li] ?? 'centered') as AlignmentMode;
  };
  const { count: derivedAtomCount } = useDerivedAtomCount();

  const states: Array<{ key: 'stateA' | 'stateB' | 'stateC'; label: string }> = [
    { key: 'stateA', label: 'State A' },
    { key: 'stateB', label: 'State B' },
    ...(useStateC ? [{ key: 'stateC' as const, label: 'State C' }] : []),
  ];

  // For slot i, list which atoms (1-indexed) use it: i+1, i+1+SLOT_COUNT, ...
  // up to the current derived count. So user sees "atom 1 + atom 5 + atom 9" etc.
  const atomsUsingSlot = (slotIdx: number): number[] => {
    const arr: number[] = [];
    for (let i = slotIdx; i < derivedAtomCount; i += SLOT_COUNT) arr.push(i + 1);
    return arr;
  };

  // Short preview of a line's first ~22 chars, joined from token texts.
  const linePreview = (li: number): string => {
    const text = (lines[li]?.tokens ?? []).map((t) => t.text).join(' ');
    return text.length > 22 ? text.slice(0, 22) + '…' : text;
  };

  return (
    <Section title="Alignment overrides">
      <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '0 0 10px' }}>
        Override per-line alignment for atoms in this slot. {SLOT_COUNT} slots total —
        atoms in the stack cycle through them (atom 5 reuses slot 1, atom 6 reuses slot 2, etc.).
        Each row is a state (A / B), each column is a line of text. Leave any dropdown on{' '}
        <b>inherit</b> to use the value from <a href="../pulse/" style={{ color: '#60a5fa' }}>Atom</a>.
      </p>
      {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => {
        const ovr = overrides[slotIdx] ?? {};
        const hasAny = !!(ovr.stateA || ovr.stateB || ovr.stateC);
        const atomsList = atomsUsingSlot(slotIdx);
        const swatch = atomPalette[slotIdx]?.blockColor ?? '#3f3f46';
        return (
          <div key={`slot-${slotIdx}`} style={{
            border: '1px solid #27272a', borderRadius: 4, padding: 8, marginBottom: 10,
          }}>
            {/* Header row: colour swatch + slot label + which atoms use it + reset */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: 3,
                  background: swatch, flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.1)',
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: 10, color: '#e4e4e7', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Slot {slotIdx + 1}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#71717a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={atomsList.length ? `Affects atom${atomsList.length > 1 ? 's' : ''} ${atomsList.join(', ')}` : 'No atoms in stack at current canvas size'}>
                    {atomsList.length === 0
                      ? '— no atoms (canvas too short)'
                      : `→ atom${atomsList.length > 1 ? 's' : ''} ${atomsList.join(', ')}`}
                  </div>
                </div>
              </div>
              {hasAny && (
                <button onClick={() => resetAtomAlignments(slotIdx)}
                  style={{
                    background: 'transparent', border: 0, color: '#71717a',
                    fontSize: 10, cursor: 'pointer', padding: 0, flexShrink: 0,
                  }}
                  title="Clear all alignment overrides for this slot">reset</button>
              )}
            </div>

            {/* Column headers — Line N + preview text */}
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4,
              paddingLeft: 60,  // matches the State label width
            }}>
              {lines.map((_, li) => (
                <div key={li} style={{
                  flex: 1, minWidth: 0,
                  fontSize: 9, color: '#71717a', lineHeight: 1.3,
                }}>
                  <div style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Line {li + 1}
                  </div>
                  <div style={{
                    color: '#52525b', fontStyle: 'italic',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }} title={linePreview(li)}>
                    {linePreview(li)}
                  </div>
                </div>
              ))}
            </div>

            {/* State rows */}
            {states.map(({ key, label }) => (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
              }}>
                <span style={{
                  width: 54, fontSize: 11, color: '#a1a1aa', fontWeight: 600,
                  flexShrink: 0,
                }}>{label}</span>
                {lines.map((_, li) => {
                  const cur = ovr[key]?.[li] ?? null;
                  const inherited = inheritedAlignment(key, li);
                  return (
                    <select key={li} value={cur ?? '__inherit__'}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAtomAlignment(slotIdx, key, li,
                          v === '__inherit__' ? null : (v as AlignmentMode));
                      }}
                      title={cur
                        ? `Override: ${cur}`
                        : `Inherits from Atom: ${inherited}`}
                      style={{
                        flex: 1, fontSize: 10,
                        background: cur ? '#1e293b' : '#0a0a0a',
                        color: cur ? '#e4e4e7' : '#71717a',
                        border: '1px solid #3f3f46', borderRadius: 3, padding: '3px 4px',
                        minWidth: 0,
                      }}>
                      {/*
                        Show the live inherited value next to "inherit" so the
                        user sees exactly what would be applied without going
                        back to Atom. Updates reactively when Pulse changes.
                      */}
                      <option value="__inherit__">inherit · {inherited}</option>
                      <AlignmentOptions />
                    </select>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </Section>
  );
}

function ExportSection() {
  const setPlaying = useStore((s) => s.setPlaying);
  const cycleDuration = useStore((s) => s.cycleDuration);
  const { count } = useDerivedAtomCount();
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
    const ts = stamp();
    const zipName = `stack-${cycleDuration.toFixed(1)}s-${fps}fps-${count}a-${ts}.zip`;
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

/** Compact timestamp `HHMMSS` for unique export filenames within a session. */
function stamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}


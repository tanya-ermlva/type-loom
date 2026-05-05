import { useEffect, useState, type ReactNode } from 'react';
import { PALETTE, useStore } from '../store';
import type { Alignment, FalloffKind } from '../types';
import { FalloffPreview } from './FalloffPreview';

const FALLOFF_OPTIONS: FalloffKind[] = [
  'linear',
  'smoothstep',
  'smootherstep',
  'gaussian',
  'constant',
];

export function Panel() {
  return (
    <aside className="w-[320px] shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto text-zinc-200 text-xs">
      <PaletteSection />
      <TextGridSection />
      <SpacingSection />
      <FalloffSection />
      <EdgeLockSection />
      <WordBlobsSection />
      <FieldsSection />
    </aside>
  );
}

// ---------- Sections ----------

function PaletteSection() {
  const backgroundColor = useStore((s) => s.globals.backgroundColor);
  const updateGlobals = useStore((s) => s.updateGlobals);
  const reset = useStore((s) => s.reset);

  return (
    <Section title="Background">
      <div className="flex items-center gap-2 mb-2">
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => updateGlobals({ backgroundColor: e.target.value })}
          className="h-7 w-9 border border-zinc-800 rounded cursor-pointer bg-transparent"
        />
        <HexInput
          value={backgroundColor}
          onChange={(c) => updateGlobals({ backgroundColor: c })}
        />
        <button
          onClick={() => { if (confirm('Reset everything to defaults?')) reset(); }}
          className="ml-auto px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-200"
        >
          Reset
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-zinc-500 mr-1">Presets</span>
        {PALETTE.map((p) => (
          <button
            key={p.name}
            onClick={() => updateGlobals({ backgroundColor: p.bg })}
            className={`w-5 h-5 rounded-sm border transition-shadow ${backgroundColor === p.bg ? 'border-blue-400 shadow-[0_0_0_1px_rgba(96,165,250,0.5)]' : 'border-zinc-700'}`}
            style={{ background: p.bg }}
            title={p.name}
          />
        ))}
      </div>
    </Section>
  );
}

function TextGridSection() {
  const word = useStore((s) => s.globals.word);
  const charCount = useStore((s) => s.globals.charCount);
  const rowCount = useStore((s) => s.globals.rowCount);
  const letterSize = useStore((s) => s.globals.letterSize);
  const alignment = useStore((s) => s.globals.alignment);
  const updateGlobals = useStore((s) => s.updateGlobals);
  const setAlignment = useStore((s) => s.setAlignment);

  return (
    <Section title="Text & Grid">
      <Field label="Word">
        <input
          type="text"
          value={word}
          onChange={(e) => updateGlobals({ word: e.target.value.toUpperCase() })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
        />
      </Field>
      <Slider label="Chars/row" value={charCount} min={1} max={48}
        onChange={(v) => updateGlobals({ charCount: Math.round(v) })} />
      <Slider label="Rows" value={rowCount} min={3} max={120}
        onChange={(v) => updateGlobals({ rowCount: Math.round(v) })} />
      <Slider label="Letter size" value={letterSize} min={6} max={80} step={1}
        onChange={(v) => updateGlobals({ letterSize: v })} />
      <Field label="Align">
        <ButtonGroup<Alignment>
          options={[
            { id: 'left', label: '⇤' },
            { id: 'center', label: '↔' },
            { id: 'right', label: '⇥' },
          ]}
          value={alignment}
          onChange={setAlignment}
        />
      </Field>
    </Section>
  );
}

function SpacingSection() {
  const rowSpacing = useStore((s) => s.globals.rowSpacing);
  const columnSpacing = useStore((s) => s.globals.columnSpacing);
  const minDistance = useStore((s) => s.globals.minDistance);
  const dropTolerance = useStore((s) => s.globals.dropTolerance);
  const updateGlobals = useStore((s) => s.updateGlobals);

  return (
    <Section title="Spacing">
      <Slider label="Row gap" value={rowSpacing} min={6} max={80} step={0.5}
        onChange={(v) => updateGlobals({ rowSpacing: v })} format={(v) => v.toFixed(0)} />
      <Slider label="Col gap" value={columnSpacing} min={6} max={200} step={1}
        onChange={(v) => updateGlobals({ columnSpacing: v })} format={(v) => v.toFixed(0)} />
      <Slider label="Min dist" value={minDistance} min={4} max={120} step={1}
        onChange={(v) => updateGlobals({ minDistance: v })} format={(v) => v.toFixed(0)} />
      <Slider label="Drop tol" value={dropTolerance} min={0} max={400} step={2}
        onChange={(v) => updateGlobals({ dropTolerance: v })} format={(v) => v.toFixed(0)} />
      <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
        Min dist = closest letters can sit. Cascade pushes them apart.
        Drop tol = how far cascade can push a letter from where physics
        wants it before that letter is dropped (chain breaks).
        0 = aggressive drop. 400 ≈ pure cascade.
      </p>
    </Section>
  );
}

function FalloffSection() {
  const falloff = useStore((s) => s.globals.falloff);
  const setFalloff = useStore((s) => s.setFalloff);

  return (
    <Section title="Falloff">
      <div className="flex items-start gap-2">
        <select
          value={falloff}
          onChange={(e) => setFalloff(e.target.value as FalloffKind)}
          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 capitalize"
        >
          {FALLOFF_OPTIONS.map((k) => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>
        <FalloffPreview kind={falloff} />
      </div>
      <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
        How force fades from field center (left) to field edge (right).
      </p>
    </Section>
  );
}

function EdgeLockSection() {
  const edgeRowsLocked = useStore((s) => s.globals.edgeRowsLocked);
  const edgeFalloffRows = useStore((s) => s.globals.edgeFalloffRows);
  const updateGlobals = useStore((s) => s.updateGlobals);

  return (
    <Section title="Edge lock (Y)">
      <Slider label="Locked" value={edgeRowsLocked} min={0} max={10}
        onChange={(v) => updateGlobals({ edgeRowsLocked: Math.round(v) })} />
      <Slider label="Falloff" value={edgeFalloffRows} min={0} max={20}
        onChange={(v) => updateGlobals({ edgeFalloffRows: Math.round(v) })} />
      <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
        Rows from top/bottom that stay pinned (no movement), then a soft band
        easing into full movability.
      </p>
    </Section>
  );
}

function WordBlobsSection() {
  const word = useStore((s) => s.globals.word);
  const wordBackgrounds = useStore((s) => s.globals.wordBackgrounds);
  const wordBlobSize = useStore((s) => s.globals.wordBlobSize);
  const wordBlobBlur = useStore((s) => s.globals.wordBlobBlur);
  const wordBlobWobble = useStore((s) => s.globals.wordBlobWobble);
  const wordColors = useStore((s) => s.globals.wordColors);
  const updateGlobals = useStore((s) => s.updateGlobals);
  const setWordColor = useStore((s) => s.setWordColor);

  // Derive the user's word list from the input string so the color pickers
  // line up 1:1 with what shows on the canvas. Re-runs on every keystroke
  // in the Word field — cheap.
  const words = word.split(/\s+/).filter((w) => w.length > 0);

  return (
    <Section title="Word Blobs">
      <label className="flex items-center gap-2 mb-2">
        <input
          type="checkbox"
          checked={wordBackgrounds}
          onChange={(e) => updateGlobals({ wordBackgrounds: e.target.checked })}
          className="cursor-pointer"
        />
        <span className="text-[11px] text-zinc-300">Color blob behind each word</span>
      </label>
      {wordBackgrounds && (
        <>
          <Slider label="Size" value={wordBlobSize} min={10} max={120} step={1}
            onChange={(v) => updateGlobals({ wordBlobSize: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Blur" value={wordBlobBlur} min={0} max={30} step={0.5}
            onChange={(v) => updateGlobals({ wordBlobBlur: v })} format={(v) => v.toFixed(1)} />
          <Slider label="Wobble" value={wordBlobWobble} min={0} max={60} step={1}
            onChange={(v) => updateGlobals({ wordBlobWobble: v })} format={(v) => v.toFixed(0)} />

          <div className="border-t border-zinc-800/60 pt-2 mt-2 space-y-1">
            <div className="text-[10px] text-zinc-500 mb-1.5">COLORS</div>
            {words.length === 0 && (
              <p className="text-[10px] text-zinc-500">No words to color.</p>
            )}
            {words.map((w, i) => {
              const color = wordColors[i] ?? '#000000';
              return (
                <div key={`${i}-${w}`} className="flex items-center gap-2 mb-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setWordColor(i, e.target.value)}
                    className="h-6 w-7 border border-zinc-800 rounded cursor-pointer bg-transparent"
                    title={`Color for "${w}"`}
                  />
                  <span className="flex-1 text-[11px] text-zinc-300 truncate">{w}</span>
                  <HexInput value={color} onChange={(c) => setWordColor(i, c)} />
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-zinc-500 leading-tight mt-2">
            Each word gets its own goo filter (different noise seed → unique
            organic edge per word). Letters always render in black.
          </p>
        </>
      )}
    </Section>
  );
}

function FieldsSection() {
  const fields = useStore((s) => s.fields);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const selectField = useStore((s) => s.selectField);
  const addField = useStore((s) => s.addField);
  const removeField = useStore((s) => s.removeField);
  const duplicateField = useStore((s) => s.duplicateField);
  const updateField = useStore((s) => s.updateField);

  const selected = fields.find((f) => f.id === selectedFieldId);

  return (
    <Section title="Fields">
      <div className="space-y-1 mb-3">
        {fields.map((f, idx) => (
          <button
            key={f.id}
            onClick={() => selectField(f.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${
              f.id === selectedFieldId ? 'bg-blue-600/30 text-zinc-100' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <span className="font-mono text-[10px] w-4 text-center">{f.strength >= 0 ? '+' : '−'}</span>
            <span className="flex-1">Field {idx + 1}</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">{Math.round(f.strength)}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); duplicateField(f.id); }}
              className="ml-1 text-zinc-600 hover:text-zinc-200"
              title="Duplicate field"
            >⎘</span>
            {fields.length > 1 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                className="ml-1 text-zinc-600 hover:text-red-400"
                title="Delete field"
              >×</span>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={addField}
        className="w-full px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 mb-3"
      >
        + Add field
      </button>

      {selected && (
        <div className="border-t border-zinc-800 pt-3 space-y-1">
          <div className="text-[10px] text-zinc-500 mb-1.5">SELECTED FIELD</div>
          <Slider label="Strength" value={selected.strength} min={-1500} max={1500} step={5}
            onChange={(v) => updateField(selected.id, { strength: v })}
            format={(v) => `${v >= 0 ? '+' : ''}${Math.round(v)}`} />
          <Slider label="Size X" value={selected.sx} min={20} max={1500} step={5}
            onChange={(v) => updateField(selected.id, { sx: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Size Y" value={selected.sy} min={20} max={2000} step={5}
            onChange={(v) => updateField(selected.id, { sy: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Pos X" value={selected.cx} min={-500} max={1700} step={1}
            onChange={(v) => {
              // Translating the shape also translates force center by the
              // same delta, preserving the offset between them.
              const dx = v - selected.cx;
              updateField(selected.id, { cx: v, fx: selected.fx + dx });
            }} format={(v) => v.toFixed(0)} />
          <Slider label="Pos Y" value={selected.cy} min={-500} max={2200} step={1}
            onChange={(v) => {
              const dy = v - selected.cy;
              updateField(selected.id, { cy: v, fy: selected.fy + dy });
            }} format={(v) => v.toFixed(0)} />

          <div className="border-t border-zinc-800/60 pt-2 mt-2 space-y-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500">FORCE CENTER</span>
              {(selected.fx !== selected.cx || selected.fy !== selected.cy) && (
                <button
                  onClick={() => updateField(selected.id, { fx: selected.cx, fy: selected.cy })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                  title="Recenter force point at shape center"
                >recenter</button>
              )}
            </div>
            <Slider label="Force X" value={selected.fx} min={-500} max={1700} step={1}
              onChange={(v) => updateField(selected.id, { fx: v })} format={(v) => v.toFixed(0)} />
            <Slider label="Force Y" value={selected.fy} min={-500} max={2200} step={1}
              onChange={(v) => updateField(selected.id, { fy: v })} format={(v) => v.toFixed(0)} />
          </div>

          <div className="border-t border-zinc-800/60 pt-2 mt-2 space-y-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500">ANIM TARGET</span>
              {(selected.targetFx !== selected.fx || selected.targetFy !== selected.fy) ? (
                <button
                  onClick={() => updateField(selected.id, { targetFx: selected.fx, targetFy: selected.fy })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                  title="Clear animation target (no animation for this field)"
                >clear</button>
              ) : (
                <button
                  onClick={() => updateField(selected.id, {
                    targetFx: selected.fx + Math.min(selected.sx * 0.6, 200),
                    targetFy: selected.fy,
                  })}
                  className="text-[10px] text-amber-400 hover:text-amber-200"
                  title="Set an animation target offset from current force center"
                >set</button>
              )}
            </div>
            <Slider label="Target X" value={selected.targetFx} min={-500} max={1700} step={1}
              onChange={(v) => updateField(selected.id, { targetFx: v })} format={(v) => v.toFixed(0)} />
            <Slider label="Target Y" value={selected.targetFy} min={-500} max={2200} step={1}
              onChange={(v) => updateField(selected.id, { targetFy: v })} format={(v) => v.toFixed(0)} />
          </div>

          <p className="text-[10px] text-zinc-500 leading-tight mt-2">
            Round = move field. Diamond = force "hot spot". Yellow ghost
            diamond = animation target — force center pings between hot
            spot and target during playback. Both are clamped inside the
            shape ellipse.
          </p>
        </div>
      )}
    </Section>
  );
}

// ---------- Reusable bits ----------

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-zinc-800 px-4 py-3.5">
      <h4 className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-500 mb-2.5">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="w-[64px] text-[11px] text-zinc-400">{label}</label>
      <div className="flex-1">{children}</div>
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
    <div className="flex items-center gap-2 mb-1.5">
      <label className="w-[64px] text-[11px] text-zinc-400">{label}</label>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500"
      />
      <span className="w-[40px] text-right text-[11px] text-zinc-200 tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}

/** Editable 6-digit hex code input, two-way bound with an external color
 *  state. While the user types, the field shows whatever they've typed
 *  (so partial values like "#ff" don't snap back); the store is only
 *  updated when the value matches `#rrggbb`. Invalid drafts fall back
 *  on blur. */
function HexInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);

  // Sync when the external value changes (e.g. via color picker).
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const isValid = /^#[0-9a-fA-F]{6}$/.test(draft);

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => {
        // Force leading "#" so user types either "abcdef" or "#abcdef" —
        // both end up well-formed in store.
        const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
        setDraft(v);
        if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase());
      }}
      onBlur={() => {
        if (!isValid) setDraft(value);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      spellCheck={false}
      className={`font-mono text-[10px] w-[68px] bg-zinc-950 border rounded px-1.5 py-0.5 text-zinc-300 focus:outline-none ${
        isValid ? 'border-zinc-800 focus:border-zinc-600' : 'border-red-600/70 text-red-400'
      }`}
    />
  );
}

function ButtonGroup<T extends string>({
  options, value, onChange,
}: {
  options: { id: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2 py-1.5 rounded text-[11px] transition-colors ${
            value === opt.id ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

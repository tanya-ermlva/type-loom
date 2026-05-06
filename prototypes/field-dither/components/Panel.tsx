import type { ReactNode } from 'react';
import { useStore } from '../store';
import type { DitherAlgo, FalloffKind } from '../types';

const ALGO_OPTIONS: { id: DitherAlgo; label: string }[] = [
  { id: 'floyd-steinberg', label: 'Floyd–Steinberg' },
  { id: 'atkinson',        label: 'Atkinson' },
  { id: 'sierra-2',        label: 'Sierra-2' },
  { id: 'bayer-4',         label: 'Bayer 4×4' },
  { id: 'bayer-8',         label: 'Bayer 8×8' },
  { id: 'threshold',       label: 'Threshold (no dither)' },
];

const FALLOFF_OPTIONS: FalloffKind[] = [
  'linear', 'smoothstep', 'smootherstep', 'gaussian', 'constant',
];

export function Panel() {
  return (
    <aside className="w-[320px] shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto text-zinc-200 text-xs">
      <ColorsSection />
      <SourceSection />
      <DitherSection />
      <GridSection />
      <FieldsSection />
    </aside>
  );
}

function SourceSection() {
  const imageDataUrl = useStore((s) => s.imageDataUrl);
  const invertImage = useStore((s) => s.globals.invertImage);
  const setImage = useStore((s) => s.setImage);
  const updateGlobals = useStore((s) => s.updateGlobals);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
    // Reset input so re-uploading the same file fires onChange again.
    e.target.value = '';
  }

  return (
    <Section title="Source image">
      <label className="block mb-2">
        <input
          type="file"
          accept=".svg,.png,.jpg,.jpeg,image/*"
          onChange={onUpload}
          className="hidden"
        />
        <span className="block px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 cursor-pointer text-center text-[12px]">
          {imageDataUrl ? 'Replace image' : 'Upload SVG / image'}
        </span>
      </label>

      {imageDataUrl && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded border border-zinc-800 bg-zinc-950 overflow-hidden flex items-center justify-center">
              <img src={imageDataUrl} alt="source" className="max-w-full max-h-full object-contain" />
            </div>
            <button
              onClick={() => setImage(null)}
              className="text-[10px] text-zinc-500 hover:text-red-400"
            >Remove</button>
          </div>
          <label className="flex items-center gap-2 mb-1">
            <input
              type="checkbox"
              checked={invertImage}
              onChange={(e) => updateGlobals({ invertImage: e.target.checked })}
              className="cursor-pointer"
            />
            <span className="text-[11px] text-zinc-300">Invert (white = letters)</span>
          </label>
        </>
      )}

      <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
        Image becomes the per-cell base intensity (dark = letters by default).
        Fields still add density (+) or carve voids (−) on top.
      </p>
    </Section>
  );
}

// ---------- Sections ----------

function ColorsSection() {
  const backgroundColor = useStore((s) => s.globals.backgroundColor);
  const letterColor = useStore((s) => s.globals.letterColor);
  const updateGlobals = useStore((s) => s.updateGlobals);
  const reset = useStore((s) => s.reset);

  return (
    <Section title="Colors">
      <Field label="Background">
        <input type="color" value={backgroundColor}
          onChange={(e) => updateGlobals({ backgroundColor: e.target.value })}
          className="h-7 w-9 border border-zinc-800 rounded cursor-pointer bg-transparent" />
      </Field>
      <Field label="Letter">
        <input type="color" value={letterColor}
          onChange={(e) => updateGlobals({ letterColor: e.target.value })}
          className="h-7 w-9 border border-zinc-800 rounded cursor-pointer bg-transparent" />
      </Field>
      <button onClick={() => { if (confirm('Reset to defaults?')) reset(); }}
        className="mt-2 text-[10px] text-zinc-500 hover:text-zinc-200">Reset</button>
    </Section>
  );
}

function DitherSection() {
  const ditherAlgo = useStore((s) => s.globals.ditherAlgo);
  const threshold = useStore((s) => s.globals.threshold);
  const baseDensity = useStore((s) => s.globals.baseDensity);
  const falloff = useStore((s) => s.globals.falloff);
  const updateGlobals = useStore((s) => s.updateGlobals);

  return (
    <Section title="Dither">
      <Field label="Algorithm">
        <select value={ditherAlgo}
          onChange={(e) => updateGlobals({ ditherAlgo: e.target.value as DitherAlgo })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100">
          {ALGO_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </Field>
      <Slider label="Threshold" value={threshold} min={0} max={1} step={0.01}
        onChange={(v) => updateGlobals({ threshold: v })}
        format={(v) => v.toFixed(2)} />
      <Slider label="Base dens" value={baseDensity} min={0} max={1} step={0.01}
        onChange={(v) => updateGlobals({ baseDensity: v })}
        format={(v) => v.toFixed(2)} />
      <Field label="Falloff">
        <select value={falloff}
          onChange={(e) => updateGlobals({ falloff: e.target.value as FalloffKind })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100 capitalize">
          {FALLOFF_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
        Each cell's intensity = base density + sum of field falloffs. Dither
        algorithm decides whether the cell renders a letter.
      </p>
    </Section>
  );
}

function GridSection() {
  const word = useStore((s) => s.globals.word);
  const charCount = useStore((s) => s.globals.charCount);
  const rowCount = useStore((s) => s.globals.rowCount);
  const letterSize = useStore((s) => s.globals.letterSize);
  const rowSpacing = useStore((s) => s.globals.rowSpacing);
  const columnSpacing = useStore((s) => s.globals.columnSpacing);
  const updateGlobals = useStore((s) => s.updateGlobals);

  return (
    <Section title="Grid">
      <Field label="Word">
        <input type="text" value={word}
          onChange={(e) => updateGlobals({ word: e.target.value.toUpperCase() })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100" />
      </Field>
      <Slider label="Cols" value={charCount} min={4} max={120}
        onChange={(v) => updateGlobals({ charCount: Math.round(v) })} />
      <Slider label="Rows" value={rowCount} min={4} max={160}
        onChange={(v) => updateGlobals({ rowCount: Math.round(v) })} />
      <Slider label="Size" value={letterSize} min={4} max={60}
        onChange={(v) => updateGlobals({ letterSize: v })} format={(v) => v.toFixed(0)} />
      <Slider label="Row gap" value={rowSpacing} min={4} max={60} step={0.5}
        onChange={(v) => updateGlobals({ rowSpacing: v })} format={(v) => v.toFixed(0)} />
      <Slider label="Col gap" value={columnSpacing} min={4} max={60} step={0.5}
        onChange={(v) => updateGlobals({ columnSpacing: v })} format={(v) => v.toFixed(0)} />
    </Section>
  );
}

function FieldsSection() {
  const fields = useStore((s) => s.fields);
  const selectedFieldId = useStore((s) => s.selectedFieldId);
  const selectField = useStore((s) => s.selectField);
  const addField = useStore((s) => s.addField);
  const removeField = useStore((s) => s.removeField);
  const updateField = useStore((s) => s.updateField);

  const selected = fields.find((f) => f.id === selectedFieldId);

  return (
    <Section title="Fields">
      <div className="space-y-1 mb-3">
        {fields.map((f, idx) => (
          <button key={f.id} onClick={() => selectField(f.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left ${
              f.id === selectedFieldId ? 'bg-blue-600/30 text-zinc-100' : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
            }`}>
            <span className="font-mono text-[10px] w-4 text-center">{f.strength >= 0 ? '+' : '−'}</span>
            <span className="flex-1">Field {idx + 1}</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">{f.strength.toFixed(2)}</span>
            {fields.length > 1 && (
              <span role="button" tabIndex={0}
                onClick={(e) => { e.stopPropagation(); removeField(f.id); }}
                className="ml-1 text-zinc-600 hover:text-red-400">×</span>
            )}
          </button>
        ))}
      </div>

      <button onClick={addField}
        className="w-full px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 mb-3">
        + Add field
      </button>

      {selected && (
        <div className="border-t border-zinc-800 pt-3 space-y-1">
          <div className="text-[10px] text-zinc-500 mb-1.5">SELECTED FIELD</div>
          <Slider label="Strength" value={selected.strength} min={-2} max={2} step={0.05}
            onChange={(v) => updateField(selected.id, { strength: v })}
            format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`} />
          <Slider label="Size X" value={selected.sx} min={20} max={1500} step={5}
            onChange={(v) => updateField(selected.id, { sx: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Size Y" value={selected.sy} min={20} max={2000} step={5}
            onChange={(v) => updateField(selected.id, { sy: v })} format={(v) => v.toFixed(0)} />
          <Slider label="Pos X" value={selected.cx} min={-500} max={1700} step={1}
            onChange={(v) => updateField(selected.id, {
              cx: v, fx: selected.fx + (v - selected.cx),
            })} format={(v) => v.toFixed(0)} />
          <Slider label="Pos Y" value={selected.cy} min={-500} max={2200} step={1}
            onChange={(v) => updateField(selected.id, {
              cy: v, fy: selected.fy + (v - selected.cy),
            })} format={(v) => v.toFixed(0)} />
          <p className="text-[10px] text-zinc-500 leading-tight mt-1.5">
            Strength + = adds density (more letters), − = carves voids.
            Drag the round handle to move, diamond for force center, squares
            to resize.
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
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500" />
      <span className="w-[44px] text-right text-[11px] text-zinc-200 tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}

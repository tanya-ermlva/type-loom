import type { ReactNode } from 'react';
import { usePosterStore } from '../store';
import type { AspectRatio, TextAlign } from '../types';

export function Panel() {
  return (
    <aside className="w-[300px] shrink-0 border-l border-zinc-800 bg-zinc-900 overflow-y-auto text-zinc-200 text-xs">
      <CursorSection />
      <EffectSection />
      <TextSection />
      <BackgroundSection />
    </aside>
  );
}

// ---------- shared bits ----------

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

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => v.toString(),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="w-[70px] text-[11px] text-zinc-400">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-blue-500"
      />
      <span className="w-[36px] text-right text-[11px] text-zinc-200 tabular-nums">
        {format(value)}
      </span>
    </div>
  );
}

function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-2 py-1.5 rounded text-[11px] transition-colors ${
            value === opt.id
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <label className="w-[70px] text-[11px] text-zinc-400">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
      />
      <span className="text-[11px] text-zinc-500 tabular-nums">{value}</span>
    </div>
  );
}

// ---------- sections ----------

function CursorSection() {
  const cursor = usePosterStore((s) => s.poster.cursor);
  const setCursor = usePosterStore((s) => s.setCursor);

  return (
    <Section title="Cursor blob">
      <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">
        Move your mouse over the canvas. The blob follows; trail samples fade behind it.
      </p>
      <Slider
        label="Size"
        value={cursor.size}
        min={0.05}
        max={1}
        step={0.01}
        onChange={(size) => setCursor({ size })}
        format={(v) => v.toFixed(2)}
      />
      <Slider
        label="Wobble"
        value={cursor.wobbleAmount}
        min={0}
        max={2.5}
        step={0.05}
        onChange={(wobbleAmount) => setCursor({ wobbleAmount })}
        format={(v) => v.toFixed(2)}
      />
      <Slider
        label="Trail"
        value={cursor.trailSeconds}
        min={0}
        max={1.5}
        step={0.05}
        onChange={(trailSeconds) => setCursor({ trailSeconds })}
        format={(v) => `${v.toFixed(2)}s`}
      />
    </Section>
  );
}

function EffectSection() {
  const effect = usePosterStore((s) => s.poster.effect);
  const setEffect = usePosterStore((s) => s.setEffect);

  return (
    <Section title="Gooey effect">
      <Slider label="Blur" value={effect.blur} min={0} max={30} step={0.1} onChange={(blur) => setEffect({ blur })} format={(v) => v.toFixed(1)} />
      <Slider label="Threshold" value={effect.threshold} min={1} max={50} onChange={(threshold) => setEffect({ threshold })} />
      <Slider label="Offset" value={effect.offset} min={-30} max={0} onChange={(offset) => setEffect({ offset })} />
      <div className="h-2" />
      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 mb-1">Organic noise</div>
      <Slider label="Distort" value={effect.noiseAmount} min={0} max={30} step={0.5} onChange={(noiseAmount) => setEffect({ noiseAmount })} format={(v) => v.toFixed(1)} />
      <Slider label="Scale" value={effect.noiseScale} min={0.003} max={0.08} step={0.001} onChange={(noiseScale) => setEffect({ noiseScale })} format={(v) => v.toFixed(3)} />
    </Section>
  );
}

function TextSection() {
  const poster = usePosterStore((s) => s.poster);
  const setFontSize = usePosterStore((s) => s.setFontSize);
  const setLineHeight = usePosterStore((s) => s.setLineHeight);
  const setTextAlign = usePosterStore((s) => s.setTextAlign);
  const setTextColor = usePosterStore((s) => s.setTextColor);
  const setFontWeight = usePosterStore((s) => s.setFontWeight);
  const setFont = usePosterStore((s) => s.setFont);

  async function onFontFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const baseName = file.name.replace(/\.(woff2?|ttf|otf)$/i, '');
    const fontFamily = `gp-${baseName}-${Date.now()}`;
    try {
      const ff = new FontFace(fontFamily, `url(${url})`);
      await ff.load();
      document.fonts.add(ff);
      setFont({ kind: 'custom', name: fontFamily, objectUrl: url });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load font', err);
    }
  }

  return (
    <Section title="Text">
      <div className="text-[11px] text-zinc-400 mb-2">
        <span>Font: </span>
        <span className="text-zinc-200">
          {poster.font.kind === 'custom' ? poster.font.name : 'system'}
        </span>
      </div>
      <label className="block mb-3">
        <input type="file" accept=".woff2,.woff,.ttf,.otf" onChange={onFontFile} className="hidden" />
        <span className="block px-2 py-1.5 rounded bg-zinc-800 text-zinc-200 text-[11px] text-center cursor-pointer hover:bg-zinc-700">
          Upload .woff2 / .ttf
        </span>
      </label>
      {poster.font.kind === 'custom' && (
        <button
          onClick={() => setFont({ kind: 'system' })}
          className="text-[11px] text-zinc-400 hover:text-zinc-200 underline mb-2"
        >
          Reset to system
        </button>
      )}

      <Slider label="Size" value={poster.fontSize} min={12} max={200} onChange={setFontSize} format={(v) => `${v}px`} />
      <Slider label="Line h." value={poster.lineHeight} min={0.8} max={2} step={0.01} onChange={setLineHeight} format={(v) => v.toFixed(2)} />
      <Slider label="Weight" value={poster.fontWeight} min={100} max={900} step={100} onChange={setFontWeight} />
      <div className="h-1.5" />
      <ButtonGroup<TextAlign>
        options={[
          { id: 'left', label: 'Left' },
          { id: 'center', label: 'Center' },
          { id: 'right', label: 'Right' },
        ]}
        value={poster.textAlign}
        onChange={setTextAlign}
      />
      <div className="h-2" />
      <ColorRow label="Color" value={poster.textColor} onChange={setTextColor} />
    </Section>
  );
}

function BackgroundSection() {
  const background = usePosterStore((s) => s.poster.background);
  const aspectRatio = usePosterStore((s) => s.poster.aspectRatio);
  const setBackground = usePosterStore((s) => s.setBackground);
  const setAspectRatio = usePosterStore((s) => s.setAspectRatio);

  return (
    <Section title="Background">
      <ColorRow label="Color" value={background} onChange={setBackground} />
      <div className="h-2" />
      <div className="text-[11px] text-zinc-400 mb-1.5">Aspect ratio</div>
      <ButtonGroup<AspectRatio>
        options={[
          { id: '1:1', label: '1:1' },
          { id: '4:5', label: '4:5' },
          { id: '9:16', label: '9:16' },
          { id: 'free', label: 'Free' },
        ]}
        value={aspectRatio}
        onChange={setAspectRatio}
      />
    </Section>
  );
}

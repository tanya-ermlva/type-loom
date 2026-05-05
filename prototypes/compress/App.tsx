import { useEffect, useRef, useState } from 'react';
import { Canvas } from './components/Canvas';
import { Panel } from './components/Panel';
import { ProjectsModal } from './components/ProjectsModal';
import { canvasSize, useStore } from './store';
import { buildRows, fieldAtProgress } from './compress';
import { exportPngFromSvg, exportVideo, renderRows, type VideoFormat } from './export';
import { captureThumbnail, saveProject } from './persistence';

export default function App() {
  const fieldsCount = useStore((s) => s.fields.length);
  const isPlaying = useStore((s) => s.isPlaying);
  const togglePlay = useStore((s) => s.togglePlay);
  const setProgress = useStore((s) => s.setProgress);
  const loopDuration = useStore((s) => s.globals.loopDuration);
  const updateGlobals = useStore((s) => s.updateGlobals);
  const toSnapshot = useStore((s) => s.toSnapshot);
  const [busy, setBusy] = useState<null | 'png' | 'video'>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);

  // Drive playback progress from a single rAF loop. The store owns `progress`
  // so both the SVG canvas and any subscribers see the same value, but the
  // loop itself lives at the App level — no risk of dueling animation loops
  // if two components ever try to drive playback.
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let startTime = performance.now() - useStore.getState().progress * loopDuration * 1000;
    const tick = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      setProgress((elapsed / loopDuration) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, loopDuration, setProgress]);

  async function onSaveProject() {
    const name = prompt('Project name:', 'Untitled');
    if (!name || !name.trim()) return;
    const svg = document.querySelector('main svg') as SVGSVGElement | null;
    const { globals } = useStore.getState();
    // Thumb dims preserve the canvas aspect so it doesn't squish in the modal.
    const { width: cw, height: ch } = canvasSize(globals.canvasFormat);
    const longSide = 280;
    const thumbW = Math.round(cw >= ch ? longSide : (longSide * cw) / ch);
    const thumbH = Math.round(ch >= cw ? longSide : (longSide * ch) / cw);
    const thumbnail = svg
      ? await captureThumbnail(svg, globals.backgroundColor, thumbW, thumbH)
      : undefined;
    saveProject(name.trim(), toSnapshot(), thumbnail);
  }

  async function onExportPng() {
    // Snapshot the live SVG (with all word blobs / filters intact) and
    // render it to a PNG. Querying main > svg works because the prototype
    // only ever has the one canvas element.
    const svg = document.querySelector('main svg') as SVGSVGElement | null;
    if (!svg) return;
    const { globals } = useStore.getState();
    const { width, height } = canvasSize(globals.canvasFormat);
    setBusy('png');
    try {
      await exportPngFromSvg(svg, width, height, globals.backgroundColor);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onExportVideo(format: VideoFormat) {
    const { fields, globals } = useStore.getState();
    const { width: CANVAS_W, height: CANVAS_H } = canvasSize(globals.canvasFormat);

    setBusy('video');
    try {
      // Offscreen canvas drives the video — the on-screen SVG keeps doing
      // its own thing. Each rAF tick recomputes rows at the current progress
      // and paints, so MediaRecorder's captureStream sees fresh frames.
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      let raf = 0;
      const startTime = performance.now();
      const draw = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const progress = Math.min(1, elapsed / globals.loopDuration);
        const effectiveFields = fields.map((f) => fieldAtProgress(f, progress));
        const rows = buildRows(effectiveFields, globals, CANVAS_W, CANVAS_H);
        renderRows(ctx, rows, globals.letterSize, '#000000', globals.backgroundColor, CANVAS_W, CANVAS_H);
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);

      try {
        await exportVideo(canvas, globals.loopDuration, format, 30);
      } finally {
        cancelAnimationFrame(raf);
      }
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      <header className="h-11 border-b border-zinc-800 bg-zinc-900 flex items-center px-4 text-[13px] gap-3">
        <span className="font-semibold">Compress</span>
        <span className="text-zinc-500 text-[11px]">Type Loom prototype · {fieldsCount} field{fieldsCount === 1 ? '' : 's'}</span>
        <div className="flex-1" />

        <button
          onClick={onSaveProject}
          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[12px]"
          title="Save current state as a named project"
        >
          Save
        </button>
        <button
          onClick={() => setProjectsOpen(true)}
          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[12px]"
          title="Open saved projects"
        >
          Projects
        </button>

        <button
          onClick={togglePlay}
          className={`px-3 py-1 rounded text-[12px] ${isPlaying ? 'bg-amber-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}
          title="Play / pause animation"
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          Loop
          <input
            type="number"
            min={0.5}
            max={30}
            step={0.5}
            value={loopDuration}
            onChange={(e) => updateGlobals({ loopDuration: Number(e.target.value) })}
            className="w-12 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-100 text-[11px]"
          />
          <span>s</span>
        </label>

        <ExportMenu
          onPng={onExportPng}
          onMp4={() => onExportVideo('mp4')}
          onWebm={() => onExportVideo('webm')}
          busy={busy}
        />
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 overflow-hidden">
          <Canvas />
        </main>
        <Panel />
      </div>

      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  );
}

function ExportMenu({
  onPng, onMp4, onWebm, busy,
}: {
  onPng: () => void;
  onMp4: () => void;
  onWebm: () => void;
  busy: null | 'png' | 'video';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click — keeps the menu single-purpose without needing
  // a backdrop or escape-key handler.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy !== null}
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-[12px]"
      >
        {busy === 'video' ? 'Recording…' : busy === 'png' ? 'Saving…' : 'Export ▾'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-[180px] bg-zinc-900 border border-zinc-700 rounded shadow-lg z-10 py-1 text-[12px]">
          <MenuItem onClick={() => { setOpen(false); onPng(); }}>
            PNG <span className="text-zinc-500 text-[10px]">— current frame</span>
          </MenuItem>
          <MenuItem onClick={() => { setOpen(false); onMp4(); }}>
            MP4 <span className="text-zinc-500 text-[10px]">— one loop</span>
          </MenuItem>
          <MenuItem onClick={() => { setOpen(false); onWebm(); }}>
            WebM <span className="text-zinc-500 text-[10px]">— one loop</span>
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-3 py-1.5 hover:bg-zinc-800">
      {children}
    </button>
  );
}

import { useState, useEffect, useRef, type RefObject } from 'react';
import { useStore } from '../state/store';
import { exportCanvasAsPng } from '../core/export/png';
import { exportCanvasAsVideo, pickMimeType } from '../core/export/video';
import { exportPngSequence } from '../core/export/pngSequence';

interface TopBarProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function TopBar({ canvasRef }: TopBarProps) {
  const input = useStore((s) => s.config.input);
  const updateConfig = useStore((s) => s.updateConfig);
  const config = useStore((s) => s.config);
  const treatments = useStore((s) => s.treatments);
  const animations = useStore((s) => s.animations);
  const loopDuration = useStore((s) => s.loopDuration);
  const setPlaying = useStore((s) => s.setPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);

  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const mp4Supported = pickMimeType('mp4') !== null;
  const hasAnimations = animations.length > 0;
  const noAnimReason = 'Add at least one animation in a treatment to enable this export.';

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleExportPng = () => {
    if (!canvasRef.current) return;
    setMenuOpen(false);
    exportCanvasAsPng(canvasRef.current);
  };

  const handleExportVideo = async (format: 'webm' | 'mp4') => {
    if (!canvasRef.current || busy) return;
    setMenuOpen(false);
    setBusy(format.toUpperCase());
    setCurrentTime(0);
    setPlaying(true);
    try {
      await exportCanvasAsVideo(canvasRef.current, loopDuration, format);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleExportSequence = async () => {
    if (busy) return;
    setMenuOpen(false);
    setBusy('PNG sequence');
    setProgress({ done: 0, total: 0 });
    try {
      await exportPngSequence({
        config, treatments, animations, loopDuration, fps: 30,
        onProgress: (done, total) => setProgress({ done, total }),
      });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-3 relative">
      <span className="text-sm font-medium text-gray-800">Type Loom</span>
      <input
        type="text"
        value={input}
        onChange={(e) => updateConfig({ input: e.target.value })}
        placeholder="TYPE"
        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-400"
      />
      <span
        className="text-[11px] text-gray-400 hidden sm:inline"
        title="Space — play / pause&#10;R — randomize palette&#10;Esc — close menus / blur input&#10;Shift+Arrow on a slider — 10× step"
      >
        ⌨ shortcuts
      </span>
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          disabled={!!busy}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy
            ? (progress ? `${busy} (${progress.done}/${progress.total})` : `${busy}…`)
            : 'Export ▾'}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded shadow-md z-10 text-sm">
            <button onClick={handleExportPng} className="block w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100">
              PNG <span className="text-gray-400 text-xs">(current frame)</span>
            </button>
            <button
              onClick={handleExportSequence}
              disabled={!hasAnimations}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
              title={hasAnimations ? '' : noAnimReason}
            >
              PNG sequence <span className="text-gray-400 text-xs">(.zip, full loop)</span>
            </button>
            <button
              onClick={() => handleExportVideo('webm')}
              disabled={!hasAnimations}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
              title={hasAnimations ? '' : noAnimReason}
            >
              WebM <span className="text-gray-400 text-xs">(VP9)</span>
            </button>
            <button
              onClick={() => handleExportVideo('mp4')}
              disabled={!mp4Supported || !hasAnimations}
              className="block w-full text-left px-3 py-2 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed"
              title={!mp4Supported ? 'Not supported in this browser — use WebM or PNG sequence + ffmpeg' : hasAnimations ? '' : noAnimReason}
            >
              MP4 <span className="text-gray-400 text-xs">(H.264{mp4Supported ? '' : ', unsupported'})</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

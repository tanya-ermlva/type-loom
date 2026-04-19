import { useState, type RefObject } from 'react';
import { useStore } from '../state/store';
import { exportCanvasAsPng } from '../core/export/png';
import { exportCanvasAsWebm } from '../core/export/video';

interface TopBarProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function TopBar({ canvasRef }: TopBarProps) {
  const input = useStore((s) => s.config.input);
  const updateConfig = useStore((s) => s.updateConfig);
  const loopDuration = useStore((s) => s.loopDuration);
  const setPlaying = useStore((s) => s.setPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const [recording, setRecording] = useState(false);

  const handleExportPng = () => {
    if (canvasRef.current) exportCanvasAsPng(canvasRef.current);
  };

  const handleExportVideo = async () => {
    if (!canvasRef.current || recording) return;
    setRecording(true);
    // Reset playhead and start playing so the recording captures one full loop.
    setCurrentTime(0);
    setPlaying(true);
    try {
      await exportCanvasAsWebm(canvasRef.current, loopDuration);
    } finally {
      setRecording(false);
    }
  };

  return (
    <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 gap-4">
      <span className="text-sm font-medium text-gray-800">Type Loom</span>
      <input
        type="text"
        value={input}
        onChange={(e) => updateConfig({ input: e.target.value })}
        placeholder="TYPE"
        className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm font-mono"
      />
      <button
        onClick={handleExportPng}
        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
      >
        Export PNG
      </button>
      <button
        onClick={handleExportVideo}
        disabled={recording}
        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Records one full loop (${loopDuration.toFixed(1)}s) as WebM`}
      >
        {recording ? 'Recording…' : 'Export WebM'}
      </button>
    </header>
  );
}

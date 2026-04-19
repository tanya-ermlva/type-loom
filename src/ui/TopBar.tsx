import type { RefObject } from 'react';
import { useStore } from '../state/store';
import { exportCanvasAsPng } from '../core/export/png';

interface TopBarProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function TopBar({ canvasRef }: TopBarProps) {
  const input = useStore((s) => s.config.input);
  const updateConfig = useStore((s) => s.updateConfig);

  const handleExport = () => {
    if (canvasRef.current) {
      exportCanvasAsPng(canvasRef.current);
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
        onClick={handleExport}
        className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700"
      >
        Export PNG
      </button>
    </header>
  );
}

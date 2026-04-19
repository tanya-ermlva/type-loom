import { useRef } from 'react';
import { TopBar } from './ui/TopBar';
import { BasePanel } from './ui/BasePanel';
import { CanvasPreview } from './ui/CanvasPreview';
import { TreatmentsPanel } from './ui/TreatmentsPanel';
import { Timeline } from './ui/Timeline';
import { useStore } from './state/store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const randomizePalette = useStore((s) => s.randomizePalette);

  useKeyboardShortcuts({
    onPlayPause: () => setPlaying(!isPlaying),
    onRandomize: randomizePalette,
    onEscape: () => {
      // Blur whatever's focused; lets Esc dismiss native menus / focused inputs.
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TopBar canvasRef={canvasRef} />
      <div className="flex-1 flex min-h-0">
        <BasePanel />
        <CanvasPreview ref={canvasRef} />
        <TreatmentsPanel />
      </div>
      <Timeline />
    </div>
  );
}

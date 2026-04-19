import { useRef } from 'react';
import { TopBar } from './ui/TopBar';
import { BasePanel } from './ui/BasePanel';
import { CanvasPreview } from './ui/CanvasPreview';
import { TreatmentsPanel } from './ui/TreatmentsPanel';
import { Timeline } from './ui/Timeline';
import { VariationsView } from './ui/VariationsView';
import { useStore } from './state/store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mode = useStore((s) => s.mode);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const randomizePalette = useStore((s) => s.randomizePalette);
  const regenerateVariations = useStore((s) => s.regenerateVariations);

  useKeyboardShortcuts({
    onPlayPause: () => setPlaying(!isPlaying),
    onRandomize: mode === 'variations' ? regenerateVariations : randomizePalette,
    onEscape: () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TopBar canvasRef={canvasRef} />
      <div className="flex-1 flex min-h-0">
        <BasePanel />
        {mode === 'single' ? (
          <>
            <CanvasPreview ref={canvasRef} />
            <TreatmentsPanel />
          </>
        ) : (
          <VariationsView />
        )}
      </div>
      <Timeline />
    </div>
  );
}

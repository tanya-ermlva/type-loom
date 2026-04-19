import { useEffect, useRef, useState } from 'react';
import { TopBar } from './ui/TopBar';
import { BasePanel } from './ui/BasePanel';
import { CanvasPreview } from './ui/CanvasPreview';
import { TreatmentsPanel } from './ui/TreatmentsPanel';
import { Timeline } from './ui/Timeline';
import { ProjectsModal } from './ui/ProjectsModal';
import { useStore } from './state/store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { usePlaybackLoop } from './hooks/usePlaybackLoop';
import { useAutoSaveDraft } from './hooks/useAutoSaveDraft';
import { getDraft } from './core/persistence/storage';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const randomizePalette = useStore((s) => s.randomizePalette);
  const loadSnapshot = useStore((s) => s.loadSnapshot);
  const [projectsOpen, setProjectsOpen] = useState(false);

  usePlaybackLoop();
  useAutoSaveDraft();

  // On first mount, restore the auto-saved draft if any.
  useEffect(() => {
    const draft = getDraft();
    if (draft) {
      try { loadSnapshot(draft); } catch { /* corrupt draft, ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useKeyboardShortcuts({
    onPlayPause: () => setPlaying(!isPlaying),
    onRandomize: randomizePalette,
    onEscape: () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
    },
  });

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <TopBar
        canvasRef={canvasRef}
        onOpenProjects={() => setProjectsOpen(true)}
      />
      <div className="flex-1 flex min-h-0">
        <BasePanel />
        <CanvasPreview ref={canvasRef} />
        <TreatmentsPanel />
      </div>
      <Timeline />
      <ProjectsModal open={projectsOpen} onClose={() => setProjectsOpen(false)} />
    </div>
  );
}

import { useRef } from 'react';
import { TopBar } from './ui/TopBar';
import { BasePanel } from './ui/BasePanel';
import { CanvasPreview } from './ui/CanvasPreview';
import { TreatmentsPanel } from './ui/TreatmentsPanel';
import { Timeline } from './ui/Timeline';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

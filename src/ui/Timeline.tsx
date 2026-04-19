import { useStore } from '../state/store';
import { computeLoopDuration } from '../core/animation/evaluate';
import { NumberField } from './controls/NumberField';

export function Timeline() {
  const isPlaying = useStore((s) => s.isPlaying);
  const currentTime = useStore((s) => s.currentTime);
  const loopDuration = useStore((s) => s.loopDuration);
  const playbackSpeed = useStore((s) => s.playbackSpeed);
  const animations = useStore((s) => s.animations);
  const setPlaying = useStore((s) => s.setPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const setLoopDuration = useStore((s) => s.setLoopDuration);
  const setPlaybackSpeed = useStore((s) => s.setPlaybackSpeed);

  const suggestedLoop = computeLoopDuration(animations);

  return (
    <footer className="h-12 border-t border-gray-200 bg-white flex items-center px-4 gap-4">
      <button
        onClick={() => setPlaying(!isPlaying)}
        className="w-9 h-7 rounded bg-gray-900 text-white text-sm hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title="Play / pause (Space)"
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button
        onClick={() => setCurrentTime(0)}
        className="text-xs text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        aria-label="Jump to start"
        title="Jump to start"
      >
        ⏮
      </button>

      <input
        type="range"
        min={0}
        max={loopDuration}
        step={0.01}
        value={currentTime}
        onChange={(e) => setCurrentTime(Number(e.target.value))}
        className="flex-1"
      />

      <div className="text-xs text-gray-500 tabular-nums w-20 text-right">
        {currentTime.toFixed(2)}s / {loopDuration.toFixed(2)}s
      </div>

      <label className="text-xs text-gray-500 flex items-center gap-1">
        speed
        <select
          value={String(playbackSpeed)}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none focus:border-blue-400"
          title="Playback speed multiplier"
        >
          <option value="0.1">0.1×</option>
          <option value="0.25">0.25×</option>
          <option value="0.5">0.5×</option>
          <option value="0.75">0.75×</option>
          <option value="1">1×</option>
          <option value="1.5">1.5×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </label>

      <label className="text-xs text-gray-500 flex items-center gap-1">
        loop
        <NumberField
          value={loopDuration}
          step={0.5}
          min={0.1}
          onChange={setLoopDuration}
          className="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
          ariaLabel="Loop duration in seconds"
        />
        <button
          onClick={() => setLoopDuration(suggestedLoop)}
          className="text-xs text-blue-600 hover:underline"
          title="Snap to LCM of all animation durations (seamless loop)"
        >
          auto
        </button>
      </label>
    </footer>
  );
}

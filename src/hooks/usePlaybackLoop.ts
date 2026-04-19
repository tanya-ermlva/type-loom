import { useEffect } from 'react';
import { useStore } from '../state/store';

/**
 * Drive the global animation clock via requestAnimationFrame whenever
 * `isPlaying` is true. Lives at the app root so the loop persists across
 * view-mode changes (Single ↔ 4-up); both views read `currentTime` from
 * the store and re-render in response.
 */
export function usePlaybackLoop(): void {
  const isPlaying = useStore((s) => s.isPlaying);
  const loopDuration = useStore((s) => s.loopDuration);
  const setCurrentTime = useStore((s) => s.setCurrentTime);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let lastTime = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;
      // Read playbackSpeed live each frame so changes take effect immediately.
      const speed = useStore.getState().playbackSpeed;
      const next = (useStore.getState().currentTime + dt * speed) % Math.max(0.1, loopDuration);
      setCurrentTime(next);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, loopDuration, setCurrentTime]);
}

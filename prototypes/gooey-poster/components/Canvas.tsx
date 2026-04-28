import type { CSSProperties, MouseEvent } from 'react';
import { useEffect, useRef } from 'react';
import { usePosterStore } from '../store';
import { cursorMaskSvg, maskSvgToDataUrl, type TrailSample } from '../lib/blob';

const ASPECT_TO_RATIO: Record<string, string> = {
  '1:1': '1 / 1',
  '4:5': '4 / 5',
  '9:16': '9 / 16',
  free: 'auto',
};

type HistoryPoint = { x: number; y: number; time: number };

// Canvas owns the cursor interaction loop:
//   - mousemove writes the live cursor position into a ref AND pushes a
//     snapshot into a history ring buffer
//   - rAF reads the current cursor + filtered history, builds a fullscreen
//     mask SVG (head blob + fading trail), and stores it on --cursor-mask
//
// Doing this in refs/CSS variables means the React tree never rerenders
// while the user is moving the mouse. Only Panel + the SVG filter (which
// reads sliders) can cause rerenders.
import { PosterText } from './PosterText';

export function Canvas() {
  const background = usePosterStore((s) => s.poster.background);
  const aspectRatio = usePosterStore((s) => s.poster.aspectRatio);
  const cursor = usePosterStore((s) => s.poster.cursor);

  const posterRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef({ x: 0.5, y: 0.5, active: false });
  const historyRef = useRef<HistoryPoint[]>([]);

  // Keep ref in sync with the latest store snapshot — closures inside the
  // rAF callback read these values without needing to re-create the loop.
  const cursorParamsRef = useRef(cursor);
  cursorParamsRef.current = cursor;

  // Single rAF loop drives the wobble and trail, regardless of whether the
  // user is moving the mouse. Stops when the component unmounts.
  useEffect(() => {
    const el = posterRef.current;
    if (!el) return;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const params = cursorParamsRef.current;

      // Drop history points older than the configured trail lifetime.
      const trailMs = params.trailSeconds * 1000;
      const cutoff = trailMs > 0 ? now - trailMs : now + 1; // +1 disables trail
      const history = historyRef.current;
      while (history.length > 0 && history[0].time < cutoff) {
        history.shift();
      }

      const trail: TrailSample[] = trailMs > 0
        ? history.map((p) => ({
            x: p.x,
            y: p.y,
            age: Math.min(1, (now - p.time) / trailMs),
          }))
        : [];

      const { x, y, active } = cursorRef.current;
      const mask = active
        ? cursorMaskSvg({
            x,
            y,
            size: params.size,
            wobbleAmount: params.wobbleAmount,
            time: (now - start) / 1000,
            trail,
          })
        // No cursor → empty mask: an SVG with no fill leaves the gooey
        // layer fully masked out so only clean text shows.
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>';

      el.style.setProperty('--cursor-mask', maskSvgToDataUrl(mask));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const posterStyle: CSSProperties = {
    background,
    aspectRatio: ASPECT_TO_RATIO[aspectRatio] ?? '4 / 5',
    width: aspectRatio === 'free' ? '80%' : undefined,
    height: aspectRatio === 'free' ? undefined : '100%',
    maxHeight: '100%',
    maxWidth: '100%',
    padding: 'clamp(16px, 3vw, 48px)',
    cursor: 'crosshair',
  };

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const el = posterRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    cursorRef.current = { x, y, active: true };
    historyRef.current.push({ x, y, time: performance.now() });
    // Cap buffer so it can't grow unbounded if trailSeconds is huge.
    if (historyRef.current.length > 200) historyRef.current.shift();
  }

  function handleLeave() {
    cursorRef.current = { ...cursorRef.current, active: false };
    historyRef.current = [];
  }

  return (
    <div className="flex h-full w-full items-center justify-center p-6 overflow-hidden">
      <div
        ref={posterRef}
        className="poster-canvas shadow-2xl rounded-sm"
        style={posterStyle}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      >
        <PosterText />
      </div>
    </div>
  );
}

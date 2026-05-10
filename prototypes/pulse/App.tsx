import { useEffect, useMemo, useState } from 'react';
import { useStore } from './store';
import { layoutLine, type TokenPosition, type TokenWidth } from './layout';
import { useTokenWidths } from './tokens';
import { easings, jitterFor, lerp, tokenProgress } from './animation';
import { Sidebar } from './Sidebar';

export default function App() {
  const composition = useStore((s) => s.composition);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);

  const {
    lines, canvasWidth, canvasHeight,
    bgColor, blockColor, textColor,
    fontFamily, fontSize, letterSpacingPct,
    lineHeight, interLineGap, tokenSpacingTight,
    edgePadding, stateA, stateB, bgBoundsModes,
    loopDuration, easing, direction, phaseOffset,
    perTokenStagger, perLineOffset, bgLag,
    jitterX, jitterY, jitterSeed,
    showTValue, showStateLabel,
  } = composition;

  const letterSpacingPx = (fontSize * letterSpacingPct) / 100;
  const widths = useTokenWidths(lines, fontFamily, fontSize, letterSpacingPx);

  // Pre-compute per-line layouts for both states.
  const layoutsAB = useMemo(() => {
    if (!widths) return null;
    // jitterSeed doubles as the deterministic seed for 'scattered' alignment so the
    // same Re-seed button shuffles both jitter and scatter positions.
    const opts = { canvasWidth, edgePadding, tokenSpacingTight, scatterSeed: jitterSeed };
    return lines.map((line, li) => {
      const tw: TokenWidth[] = line.tokens.map((t) => ({
        id: t.id, width: widths.get(t.id) ?? 0,
      }));
      return {
        a: layoutLine(tw, stateA.alignments[li] ?? 'centered', opts),
        b: layoutLine(tw, stateB.alignments[li] ?? 'centered', opts),
      };
    });
  }, [widths, lines, stateA.alignments, stateB.alignments, canvasWidth, edgePadding, tokenSpacingTight, jitterSeed]);

  // RAF loop drives a normalized progress in [0, 1].
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!playing || direction === 'freeze-A' || direction === 'freeze-B') {
      setT(direction === 'freeze-B' ? 1 : 0);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const phase = (elapsed / loopDuration + phaseOffset) % 1;
      let progress: number;
      if (direction === 'ping-pong') {
        progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      } else {
        progress = phase;
      }
      setT(progress);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loopDuration, phaseOffset, direction]);

  // Per-line interpolated positions.
  const renderedLayouts: { positions: (TokenPosition & { yJ?: number })[]; bgPositions: TokenPosition[] }[] | null =
    useMemo(() => {
      if (!layoutsAB) return null;
      return layoutsAB.map(({ a, b }, li) => {
        // Apply per-line phase offset for line index > 0.
        let lineProgress = t;
        if (li > 0) lineProgress = ((t + perLineOffset) % 1 + 1) % 1;
        const lineEase = easings[easing];
        const totalTokens = a.length;

        const interp = (which: 'tokens' | 'bg') => a.map((aPos, ti) => {
          const bPos = b[ti];
          const baseProg = which === 'bg'
            ? Math.max(0, lineProgress - bgLag)
            : lineProgress;
          const tp = tokenProgress(baseProg, perTokenStagger, totalTokens, ti);
          const eased = lineEase(tp);
          const x = lerp(aPos.x, bPos.x, eased);
          // Lerp width and scaleX too so 'stretched' alignment animates smoothly.
          const width = lerp(aPos.width, bPos.width, eased);
          const scaleA = aPos.scaleX ?? 1;
          const scaleB = bPos.scaleX ?? 1;
          const scaleX = lerp(scaleA, scaleB, eased);
          const yJ = jitterY > 0 ? jitterFor(jitterSeed + 1000 * li, ti) * jitterY : 0;
          const xJ = jitterX > 0 ? jitterFor(jitterSeed + li, ti) * jitterX : 0;
          return { id: aPos.id, x: x + xJ, width, scaleX, yJ };
        });

        const tokens = interp('tokens');
        // For bg: ignore yJ; just need x bounds.
        const bgPositions = interp('bg').map(({ id, x, width }) => ({ id, x, width }));
        return { positions: tokens, bgPositions };
      });
    }, [layoutsAB, t, easing, perTokenStagger, perLineOffset, bgLag, jitterX, jitterY, jitterSeed]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: '#0a0a0a', color: '#e4e4e7',
    }}>
      <header style={{
        height: 44, padding: '0 16px', display: 'flex', alignItems: 'center',
        gap: 12, borderBottom: '1px solid #27272a', fontSize: 13,
      }}>
        <span style={{ fontWeight: 600 }}>Pulse</span>
        <span style={{ color: '#71717a', fontSize: 11 }}>Type Loom prototype</span>
        <div style={{ flex: 1 }} />
        <a href="../" style={{ color: '#71717a', textDecoration: 'none', fontSize: 11 }}>← all prototypes</a>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, position: 'relative', overflow: 'hidden',
        }}>
        <svg
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          style={{ width: 'min(100%, 90vw)', maxHeight: '85vh', background: bgColor, display: 'block' }}
        >
          {renderedLayouts && renderedLayouts.map((row, li) => {
            if (row.positions.length === 0) return null;
            // bgX/bgRight cover the full line span — used for 'continuous' bg AND for line-bounds debug overlay.
            const bgX = Math.min(...row.bgPositions.map((p) => p.x));
            const bgRight = Math.max(...row.bgPositions.map((p) => p.x + p.width));
            const bgY = li * (lineHeight + interLineGap);
            const baselineY = bgY + lineHeight * 0.8;
            const fillMode = bgBoundsModes?.[li] ?? 'continuous';
            return (
              <g key={lines[li].id}>
                {fillMode === 'continuous' ? (
                  // One rect per line: spans first→last token, fills the gaps between tokens.
                  <rect x={bgX} y={bgY} width={bgRight - bgX} height={lineHeight} fill={blockColor} />
                ) : (
                  // One rect per token: exactly the token's bounds. Gaps reveal canvas bg.
                  row.bgPositions.map((p) => (
                    <rect key={`bg-${p.id}`}
                      x={p.x} y={bgY} width={p.width} height={lineHeight} fill={blockColor} />
                  ))
                )}
                {lines[li].tokens.map((tok, ti) => {
                  const p = row.positions[ti];
                  // Apply textLength only when 'stretched' alignment is contributing (scaleX != 1).
                  // Otherwise omit it so SVG renders text at its natural metrics.
                  const useStretch = (p.scaleX ?? 1) !== 1 && p.width > 0;
                  return (
                    <text
                      key={tok.id}
                      x={p.x} y={baselineY + (p.yJ ?? 0)}
                      fontFamily={fontFamily} fontSize={fontSize}
                      letterSpacing={letterSpacingPx} fill={textColor}
                      style={{ dominantBaseline: 'alphabetic' }}
                      {...(useStretch ? { textLength: p.width, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
                    >
                      {tok.text}
                    </text>
                  );
                })}
                {composition.showLineBounds && (
                  <rect x={bgX} y={bgY} width={bgRight - bgX} height={lineHeight}
                    fill="none" stroke="#ff00ff" strokeWidth={1.5} pointerEvents="none" />
                )}
                {composition.showTokenBounds && lines[li].tokens.map((tok, ti) => {
                  const p = row.positions[ti];
                  return (
                    <rect key={`tb-${tok.id}`}
                      x={p.x} y={bgY} width={p.width} height={lineHeight}
                      fill="none" stroke="#00ffff" strokeWidth={1} pointerEvents="none" />
                  );
                })}
              </g>
            );
          })}
          {composition.showCanvasGrid && (
            <g pointerEvents="none" stroke="#000" strokeOpacity={0.08} strokeWidth={1}>
              {Array.from({ length: Math.ceil(canvasWidth / 100) }, (_, i) => (
                <line key={`vx-${i}`} x1={i * 100} y1={0} x2={i * 100} y2={canvasHeight} />
              ))}
              {Array.from({ length: Math.ceil(canvasHeight / 50) }, (_, i) => (
                <line key={`vy-${i}`} x1={0} y1={i * 50} x2={canvasWidth} y2={i * 50} />
              ))}
            </g>
          )}
        </svg>

        {/* Bottom-left play/pause */}
        <button
          onClick={() => setPlaying(!playing)}
          style={{
            position: 'absolute', left: 32, bottom: 32,
            background: 'rgba(0,0,0,0.7)', color: 'white', border: 0,
            padding: '6px 10px', borderRadius: 4, fontSize: 12, cursor: 'pointer',
          }}
        >{playing ? '❚❚ Pause' : '▶ Play'}</button>

        {/* Bottom-right t / state readout */}
        {(showTValue || showStateLabel) && (
          <div style={{
            position: 'absolute', right: 32, bottom: 32,
            background: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px 16px',
            borderRadius: 6, fontSize: 16, fontFamily: 'ui-monospace, monospace',
            fontWeight: 500, letterSpacing: '0.02em', lineHeight: 1.2,
          }}>
            {showTValue && `t = ${t.toFixed(3)}`}
            {showTValue && showStateLabel && '  ·  '}
            {showStateLabel && (
              <span style={{ fontWeight: 700 }}>
                {t < 0.05 ? 'A' : t > 0.95 ? 'B' : '↔'}
              </span>
            )}
          </div>
        )}
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

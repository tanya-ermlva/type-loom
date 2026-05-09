import { useMemo } from 'react';
import { useStore } from './store';
import { layoutLine, type TokenWidth } from './layout';
import { useTokenWidths } from './tokens';

export default function App() {
  const composition = useStore((s) => s.composition);
  const {
    lines, canvasWidth, canvasHeight,
    bgColor, blockColor, textColor,
    fontFamily, fontSize, letterSpacingPct,
    lineHeight, interLineGap, tokenSpacingTight,
    edgePadding, stateA,
  } = composition;

  const letterSpacingPx = (fontSize * letterSpacingPct) / 100;

  // Measure every token's rendered width.
  const widths = useTokenWidths(lines, fontFamily, fontSize, letterSpacingPx);

  // Compute layouts for each line in State A.
  const layouts = useMemo(() => {
    if (!widths) return null;
    return lines.map((line, li) => {
      const tokenWidths: TokenWidth[] = line.tokens.map((t) => ({
        id: t.id,
        width: widths.get(t.id) ?? 0,
      }));
      return layoutLine(tokenWidths, stateA.alignments[li] ?? 'centered', {
        canvasWidth, edgePadding, tokenSpacingTight,
      });
    });
  }, [widths, lines, stateA.alignments, canvasWidth, edgePadding, tokenSpacingTight]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: '#0a0a0a',
    }}>
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        style={{
          width: 'min(100%, 90vw)',
          maxHeight: '90vh',
          background: bgColor,
          display: 'block',
        }}
      >
        {layouts && layouts.map((positions, li) => {
          if (positions.length === 0) return null;
          const bgX = Math.min(...positions.map((p) => p.x));
          const bgRight = Math.max(...positions.map((p) => p.x + p.width));
          const bgY = li * (lineHeight + interLineGap);
          const baselineY = bgY + lineHeight * 0.8;
          return (
            <g key={lines[li].id}>
              <rect x={bgX} y={bgY} width={bgRight - bgX} height={lineHeight} fill={blockColor} />
              {lines[li].tokens.map((tok, ti) => (
                <text
                  key={tok.id}
                  x={positions[ti].x} y={baselineY}
                  fontFamily={fontFamily} fontSize={fontSize}
                  letterSpacing={letterSpacingPx} fill={textColor}
                  style={{ dominantBaseline: 'alphabetic' }}
                >
                  {tok.text}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

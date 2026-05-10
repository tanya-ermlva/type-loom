/**
 * Atom — self-contained pulse animation. Owns its own RAF based on
 * composition's loopDuration / direction / phaseOffset / useStateC.
 *
 * Used by:
 *   • Pulse (the single-atom playground) — passes raw composition.
 *   • Stack — passes the same composition with a per-atom phaseOffset shift.
 *
 * `playing` controls whether the RAF advances time. When false, the
 * current `tick` value freezes (so pause/resume keeps the moment).
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { layoutLine, type TokenPosition, type TokenWidth } from './layout';
import { useTokenWidths, type TokenMetrics } from './tokens';
import { characterEffect, easingFn, jitterFor, lerp, tokenProgress } from './animation';
import type { Composition } from './store';

interface AtomProps {
  composition: Composition;
  /** RAF on/off. Defaults to true. */
  playing?: boolean;
  /** Optional style overrides for the outer <svg>. */
  style?: CSSProperties;
  /** When true, debug overlays render (token bounds, line bounds, canvas grid). */
  debug?: boolean;
  /** When set, RAF is bypassed and `t` is taken from this value (used for export). */
  tOverride?: number | null;
  /** DOM id added to the root <svg>. Used by export to locate the live element. */
  svgId?: string;
  /**
   * If provided, skip the internal token-width measurement and use this map
   * instead. Lets a parent (e.g., Stack) measure once and share across atoms.
   */
  widthsOverride?: Map<string, TokenMetrics> | null;
}

export function Atom({
  composition, playing = true, style, debug = false,
  tOverride, svgId, widthsOverride,
}: AtomProps) {
  const {
    lines, canvasWidth, canvasHeight,
    bgColor, blockColor, textColor,
    fontFamily, fontSize, letterSpacingPct,
    lineHeight, interLineGap, tokenSpacingTight,
    edgePadding, stateA, stateB, stateC, useStateC, bgBoundsModes,
    characterStaggerEnabled, characterStagger,
    characterEffect: charEffectMode, characterAmplitude,
    easing, easingCurve,
    loopDuration, direction, phaseOffset,
    perTokenStagger, perLineOffset, bgLag,
    jitterX, jitterY, jitterSeed,
    trailsEnabled, trailColors, trailLagStep,
    showTokenBounds, showLineBounds, showCanvasGrid,
  } = composition;

  const letterSpacingPx = (fontSize * letterSpacingPct) / 100;
  // Use parent-provided widths if available (Stack passes shared measurements);
  // otherwise measure ourselves (Pulse playground path).
  const internalWidths = useTokenWidths(
    widthsOverride ? null : lines,
    fontFamily, fontSize, letterSpacingPx,
  );
  const widths = widthsOverride ?? internalWidths;

  // ----- Internal RAF -----
  // Animation parameters (loopDuration, phaseOffset, direction, useStateC)
  // are read through a ref inside the RAF loop so updating them doesn't tear
  // down + restart the RAF — which would otherwise cause a 1-frame mismatch
  // at composition swaps (visible as an "extra frame" at cycle wrap).
  // Only `playing` and `tOverride` toggle the RAF on/off.
  const tickRef = useRef(0); // accumulated seconds across pause/resume
  const [tInternal, setT] = useState(0);
  const tFromOverride = tOverride !== null && tOverride !== undefined;
  const valuesRef = useRef({ loopDuration, phaseOffset, direction, useStateC });
  valuesRef.current = { loopDuration, phaseOffset, direction, useStateC };

  useEffect(() => {
    if (tFromOverride) return;
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const initialOffset = tickRef.current;
    const loop = (now: number) => {
      const v = valuesRef.current;
      if (v.direction === 'freeze-A') {
        setT(0);
        raf = requestAnimationFrame(loop);
        return;
      }
      if (v.direction === 'freeze-B') {
        setT(v.useStateC ? 1 / 3 : 1);
        raf = requestAnimationFrame(loop);
        return;
      }
      const elapsed = initialOffset + (now - start) / 1000;
      tickRef.current = elapsed;
      const phase = (elapsed / Math.max(0.05, v.loopDuration) + v.phaseOffset) % 1;
      let progress: number;
      if (v.useStateC) progress = phase;
      else if (v.direction === 'ping-pong') progress = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
      else progress = phase;
      setT(progress);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, tFromOverride]);

  const t = tFromOverride ? tOverride! : tInternal;

  // Pre-compute per-line layouts for each state (A, B, C).
  const layoutsABC = useMemo(() => {
    if (!widths) return null;
    const opts = { canvasWidth, edgePadding, tokenSpacingTight, scatterSeed: jitterSeed };
    return lines.map((line, li) => {
      const tw: TokenWidth[] = line.tokens.map((tok) => ({
        id: tok.id, width: widths.get(tok.id)?.width ?? 0,
      }));
      return {
        a: layoutLine(tw, stateA?.alignments?.[li] ?? 'centered', opts),
        b: layoutLine(tw, stateB?.alignments?.[li] ?? 'centered', opts),
        c: layoutLine(tw, stateC?.alignments?.[li] ?? 'centered', opts),
      };
    });
  }, [widths, lines, stateA?.alignments, stateB?.alignments, stateC?.alignments,
      canvasWidth, edgePadding, tokenSpacingTight, jitterSeed]);

  const renderedLayouts = useMemo(() => {
    if (!layoutsABC) return null;
    return layoutsABC.map(({ a, b, c }, li) => {
      let lineProgress = t;
      if (li > 0) lineProgress = ((t + perLineOffset) % 1 + 1) % 1;
      const lineEase = easingFn(easing, easingCurve);
      const totalTokens = a.length;
      const segments: Array<[TokenPosition[], TokenPosition[]]> = useStateC
        ? [[a, b], [b, c], [c, a]]
        : [[a, b]];

      const interp = (which: 'tokens' | 'bg', extraLag = 0) => a.map((_, ti) => {
        const baseLag = which === 'bg' ? bgLag + extraLag : 0;
        const baseProg = Math.max(0, lineProgress - baseLag);
        const segCount = segments.length;
        const rawSeg = baseProg * segCount;
        const segIdx = Math.min(segCount - 1, Math.max(0, Math.floor(rawSeg)));
        const segLocal = rawSeg - segIdx;
        const seg = segments[segIdx] ?? segments[0] ?? [a, a];
        const [from, to] = seg;
        const fromPos = from[ti] ?? a[ti];
        const toPos = to[ti] ?? a[ti];
        if (!fromPos || !toPos) {
          return { id: a[ti]?.id ?? `pad-${ti}`, x: 0, width: 0, scaleX: 1, yJ: 0, eased: 0 };
        }
        const tp = tokenProgress(segLocal, perTokenStagger, totalTokens, ti);
        const eased = lineEase(tp);
        const x = lerp(fromPos.x, toPos.x, eased);
        const width = lerp(fromPos.width, toPos.width, eased);
        const scaleX = lerp(fromPos.scaleX ?? 1, toPos.scaleX ?? 1, eased);
        const yJ = jitterY > 0 ? jitterFor(jitterSeed + 1000 * li, ti) * jitterY : 0;
        const xJ = jitterX > 0 ? jitterFor(jitterSeed + li, ti) * jitterX : 0;
        return { id: fromPos.id, x: x + xJ, width, scaleX, yJ, eased };
      });

      const tokens = interp('tokens');
      const bgPositions = interp('bg').map(({ id, x, width }) => ({ id, x, width }));
      // Compute trail bg positions (one per trail color), each at increasing extra lag.
      const trailBgPositions: { id: string; x: number; width: number }[][] = trailsEnabled
        ? trailColors.map((_, ti) =>
            interp('bg', trailLagStep * (ti + 1)).map(({ id, x, width }) => ({ id, x, width })))
        : [];
      return { positions: tokens, bgPositions, trailBgPositions };
    });
  }, [layoutsABC, t, easing, easingCurve, perTokenStagger, perLineOffset, bgLag,
      jitterX, jitterY, jitterSeed, useStateC,
      trailsEnabled, trailColors, trailLagStep]);

  const debugOn = debug && (showTokenBounds || showLineBounds || showCanvasGrid);

  return (
    <svg
      id={svgId}
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ background: bgColor, display: 'block', width: '100%', height: '100%', ...style }}
    >
      {renderedLayouts && renderedLayouts.map((row, li) => {
        if (row.positions.length === 0) return null;
        const bgX = Math.min(...row.bgPositions.map((p) => p.x));
        const bgRight = Math.max(...row.bgPositions.map((p) => p.x + p.width));
        const bgY = li * (lineHeight + interLineGap);
        const baselineY = bgY + lineHeight * 0.8;
        const fillMode = bgBoundsModes?.[li] ?? 'continuous';
        return (
          <g key={lines[li].id}>
            {/* Trails: ALWAYS per-token, regardless of fillMode. Each trail = the
                token's bg-rect sampled at an earlier point on the same curve, so
                a token moving left leaves trails on its right (where it came from)
                and vice versa. For lines where the line-bg as a whole only grows
                without translating, per-token trails still reveal direction per token. */}
            {trailsEnabled && row.trailBgPositions && [...row.trailBgPositions].reverse().map((trailPos, revIdx) => {
              const ti = row.trailBgPositions!.length - 1 - revIdx;
              const color = trailColors[ti];
              if (!color || !trailPos.length) return null;
              return trailPos.map((p) => (
                <rect key={`trail-${li}-${ti}-${p.id}`}
                  x={p.x} y={bgY} width={p.width} height={lineHeight} fill={color} />
              ));
            })}
            {fillMode === 'continuous' ? (
              <rect x={bgX} y={bgY} width={bgRight - bgX} height={lineHeight} fill={blockColor} />
            ) : (
              row.bgPositions.map((p) => (
                <rect key={`bg-${p.id}`}
                  x={p.x} y={bgY} width={p.width} height={lineHeight} fill={blockColor} />
              ))
            )}
            {lines[li].tokens.map((tok, ti) => {
              const p = row.positions[ti];
              const tokY = baselineY + (p.yJ ?? 0);
              const useStretch = (p.scaleX ?? 1) !== 1 && p.width > 0;
              const tokMetrics = widths?.get(tok.id);
              const renderPerChar =
                characterStaggerEnabled &&
                charEffectMode !== 'none' &&
                tokMetrics && tokMetrics.letters.length > 0;

              if (renderPerChar) {
                const totalChars = tokMetrics.letters.length;
                const segLocal = p.eased ?? 0;
                return (
                  <g key={tok.id}>
                    {Array.from(tok.text).map((ch, ci) => {
                      const lm = tokMetrics.letters[ci];
                      if (!lm) return null;
                      const charLocal = tokenProgress(segLocal, characterStagger, totalChars, ci);
                      const eff = characterEffect(charEffectMode, ci, totalChars, charLocal, characterAmplitude);
                      const cx = p.x + lm.offsetX;
                      const cy = tokY;
                      const cxCenter = cx + lm.width / 2;
                      const transforms: string[] = [];
                      if (eff.rotate !== 0) transforms.push(`rotate(${eff.rotate} ${cxCenter} ${cy})`);
                      if (eff.scaleY !== 1) {
                        transforms.push(
                          `translate(${cxCenter} ${cy}) scale(1 ${eff.scaleY}) translate(${-cxCenter} ${-cy})`,
                        );
                      }
                      const transform = transforms.length ? transforms.join(' ') : undefined;
                      return (
                        <text key={`${tok.id}-${ci}`}
                          x={cx + eff.dx} y={cy + eff.dy}
                          fontFamily={fontFamily} fontSize={fontSize}
                          fill={textColor}
                          style={{ dominantBaseline: 'alphabetic' }}
                          transform={transform}
                        >{ch}</text>
                      );
                    })}
                  </g>
                );
              }

              return (
                <text
                  key={tok.id}
                  x={p.x} y={tokY}
                  fontFamily={fontFamily} fontSize={fontSize}
                  letterSpacing={letterSpacingPx} fill={textColor}
                  style={{ dominantBaseline: 'alphabetic' }}
                  {...(useStretch ? { textLength: p.width, lengthAdjust: 'spacingAndGlyphs' as const } : {})}
                >{tok.text}</text>
              );
            })}
            {debugOn && showLineBounds && (
              <rect x={bgX} y={bgY} width={bgRight - bgX} height={lineHeight}
                fill="none" stroke="#ff00ff" strokeWidth={1.5} pointerEvents="none" />
            )}
            {debugOn && showTokenBounds && lines[li].tokens.map((tok, ti) => {
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
      {debugOn && showCanvasGrid && (
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
  );
}

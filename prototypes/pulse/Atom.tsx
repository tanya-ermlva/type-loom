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
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { layoutLine, type TokenPosition, type TokenWidth } from './layout';
import { useTokenWidths, type TokenMetrics } from './tokens';
import { characterEffect, easingFn, jitterFor, lerp, tokenProgress } from './animation';
import type { Composition, DirectionMode } from './store';

interface AtomProps {
  composition: Composition;
  /** RAF on/off. Defaults to true. */
  playing?: boolean;
  /** Optional style overrides for the outer <svg>. */
  style?: CSSProperties;
  /** When true, debug overlays render (token bounds, line bounds, canvas grid). */
  debug?: boolean;
  /**
   * When set, RAF is bypassed and the raw cycle phase (0..1, BEFORE the
   * ping-pong remap) is taken from this value. Used for export so trail
   * direction stays correct in the reverse half of ping-pong cycles.
   */
  phaseOverride?: number | null;
  /** DOM id added to the root <svg>. Used by export to locate the live element. */
  svgId?: string;
  /**
   * If provided, skip the internal token-width measurement and use this map
   * instead. Lets a parent (e.g., Stack) measure once and share across atoms.
   */
  widthsOverride?: Map<string, TokenMetrics> | null;
}

/**
 * Map raw cycle phase (0..1) to layout progress (0..1), respecting direction.
 *   • useStateC=true  → progress = phase (cycle is A→B→C→A, monotonic).
 *   • ping-pong       → progress = phase<.5 ? phase*2 : (1-phase)*2 (folds back).
 *   • freeze-A        → 0 (always state A).
 *   • freeze-B        → 1 (always state B; or 1/3 in useStateC).
 *   • one-way         → progress = phase.
 * Pulled out so trail sampling can lag in PHASE space (real time), then
 * re-apply this mapping — keeping trail direction tied to actual motion.
 */
function phaseToProgress(
  phase: number, direction: DirectionMode, useStateC: boolean,
): number {
  if (useStateC) return phase;
  if (direction === 'ping-pong') return phase < 0.5 ? phase * 2 : (1 - phase) * 2;
  if (direction === 'freeze-A') return 0;
  if (direction === 'freeze-B') return 1;
  return phase;
}

export function Atom({
  composition, playing = true, style, debug = false,
  phaseOverride, svgId, widthsOverride,
}: AtomProps) {
  const {
    lines, canvasWidth, canvasHeight,
    bgColor, blockColor, textColor,
    fontFamily, fontSize, letterSpacingPct,
    lineHeight, interLineGap, tokenSpacingTight,
    edgePadding, stateA, stateB, stateC, useStateC, bgBoundsModes,
    characterStaggerEnabled, characterStagger,
    characterEffect: charEffectMode, characterAmplitude,
    borderScaleEnabled, borderScaleAmplitude,
    easing, easingCurve,
    loopDuration, direction, phaseOffset,
    perTokenStagger, perLineOffset, bgLag,
    jitterX, jitterY, jitterSeed,
    trailsEnabled, trailCount, trailLagStep,
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
  // Only `playing` and `phaseOverride` toggle the RAF on/off.
  //
  // We store the RAW phase (0..1, pre-ping-pong remap) rather than the post-
  // mapped progress, because trails lag in TIME (phase) and then re-apply the
  // ping-pong fold so direction matches actual motion in both halves of a
  // ping-pong cycle.
  const tickRef = useRef(0); // accumulated seconds across pause/resume
  const [phaseInternal, setPhase] = useState(0);
  const phaseFromOverride = phaseOverride !== null && phaseOverride !== undefined;
  const valuesRef = useRef({ loopDuration, phaseOffset, direction, useStateC });
  valuesRef.current = { loopDuration, phaseOffset, direction, useStateC };

  useEffect(() => {
    if (phaseFromOverride) return;
    if (!playing) return;
    let raf = 0;
    const start = performance.now();
    const initialOffset = tickRef.current;
    const loop = (now: number) => {
      const v = valuesRef.current;
      // Freeze states ignore phase — phaseToProgress maps any phase to the
      // frozen progress value. We still update phase so trails (which lag in
      // phase) settle to the same frozen state.
      if (v.direction === 'freeze-A') {
        setPhase(0);
        raf = requestAnimationFrame(loop);
        return;
      }
      if (v.direction === 'freeze-B') {
        setPhase(1);
        raf = requestAnimationFrame(loop);
        return;
      }
      const elapsed = initialOffset + (now - start) / 1000;
      tickRef.current = elapsed;
      const phase = (elapsed / Math.max(0.05, v.loopDuration) + v.phaseOffset) % 1;
      setPhase(phase);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, phaseFromOverride]);

  const phase = phaseFromOverride ? phaseOverride! : phaseInternal;
  // Stable mapper used both for the main render path and trail sampling.
  const toProgress = useCallback(
    (ph: number) => phaseToProgress(ph, direction, useStateC),
    [direction, useStateC],
  );

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
      // perLineOffset shifts line li's PHASE (raw time), so the per-line stagger
      // is independent of the ping-pong fold direction.
      const linePhase = li > 0
        ? ((phase + perLineOffset) % 1 + 1) % 1
        : phase;
      const lineEase = easingFn(easing, easingCurve);
      const totalTokens = a.length;
      const segments: Array<[TokenPosition[], TokenPosition[]]> = useStateC
        ? [[a, b], [b, c], [c, a]]
        : [[a, b]];

      // CRITICAL: lag is applied in PHASE space (raw time), then re-mapped
      // through ping-pong. This makes trail direction follow actual motion:
      //   • forward half: lower phase = earlier in time = trail behind motion
      //   • reverse half: lower phase = also earlier in time, and after the
      //     ping-pong fold lands on the OPPOSITE side of the current position.
      // Lagging in progress space (the old behavior) put trails on the same
      // side regardless of which half of the ping-pong we were in.
      const interp = (which: 'tokens' | 'bg', extraLag = 0) => a.map((_, ti) => {
        const baseLag = which === 'bg' ? bgLag + extraLag : 0;
        // Wrap lagged phase into [0, 1) so trails carry across cycle boundaries
        // (visible as continuous motion through the loop seam).
        const laggedPhase = ((linePhase - baseLag) % 1 + 1) % 1;
        const baseProg = toProgress(laggedPhase);
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

      // 'tokens' code path uses zero lag; main bg uses bgLag; trails layer
      // additional extraLag on top.
      const tokens = interp('tokens');
      const bgPositions = interp('bg').map(({ id, x, width }) => ({ id, x, width }));
      // Compute trail bg positions (one per trail), each at increasing extra
      // lag in PHASE space — direction-aware in both halves of ping-pong.
      const safeCount = trailsEnabled ? Math.max(0, Math.floor(trailCount)) : 0;
      const trailBgPositions: { id: string; x: number; width: number }[][] =
        Array.from({ length: safeCount }, (_, ti) =>
          interp('bg', trailLagStep * (ti + 1)).map(({ id, x, width }) => ({ id, x, width })));
      return { positions: tokens, bgPositions, trailBgPositions };
    });
  }, [layoutsABC, phase, toProgress, easing, easingCurve, perTokenStagger,
      perLineOffset, bgLag, jitterX, jitterY, jitterSeed, useStateC,
      trailsEnabled, trailCount, trailLagStep]);

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
            {/* Trails: ALWAYS per-token, regardless of fillMode. Each trail =
                the token's bg-rect at an earlier point on the curve, sampled in
                phase space (direction-aware in both halves of ping-pong). All
                trails use blockColor; opacity fades linearly from 0.9 (closest)
                to 0.0 (deepest) across `trailCount`. Where a trail overlaps the
                main bg there's no visible change (same colour over same colour);
                where it extends beyond, you see a faded ghost of the bg shape.
                Render order: deepest first → closest last (so closer trails
                stack on top and appear more opaque). */}
            {trailsEnabled && row.trailBgPositions && row.trailBgPositions.length > 0
              && [...row.trailBgPositions].reverse().map((trailPos, revIdx) => {
                const total = row.trailBgPositions!.length;
                const ti = total - 1 - revIdx;
                if (!trailPos.length) return null;
                // Linear lerp(0.9, 0, ti/(total-1)). For total=1, single trail at 0.9.
                const opacity = total > 1 ? 0.9 * (1 - ti / (total - 1)) : 0.9;
                if (opacity <= 0) return null; // skip the literally-invisible trail
                return trailPos.map((p) => (
                  <rect key={`trail-${li}-${ti}-${p.id}`}
                    x={p.x} y={bgY} width={p.width} height={lineHeight}
                    fill={blockColor} opacity={opacity} />
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
              // Per-char render is needed if we have ANY per-letter effect:
              //   • a time-based character effect (bow/fan/stretch/wave with stagger)
              //   • position-based border-scale (scales each letter by its own X)
              const hasTimeEffect = characterStaggerEnabled && charEffectMode !== 'none';
              const renderPerChar =
                (hasTimeEffect || borderScaleEnabled) &&
                !!tokMetrics && tokMetrics.letters.length > 0;

              if (renderPerChar && tokMetrics) {
                const totalChars = tokMetrics.letters.length;
                const segLocal = p.eased ?? 0;
                const halfCanvas = canvasWidth / 2;
                return (
                  <g key={tok.id}>
                    {Array.from(tok.text).map((ch, ci) => {
                      const lm = tokMetrics.letters[ci];
                      if (!lm) return null;
                      const eff = hasTimeEffect
                        ? characterEffect(charEffectMode, ci, totalChars,
                            tokenProgress(segLocal, characterStagger, totalChars, ci),
                            characterAmplitude)
                        : { dx: 0, dy: 0, rotate: 0, scaleY: 1 };
                      const cx = p.x + lm.offsetX;
                      const cy = tokY;
                      const cxCenter = cx + lm.width / 2;
                      // Position-driven uniform scale: 1 at canvas center,
                      // 1+amplitude at literal edge. Clamp dist so off-canvas
                      // letters don't blow up further than the edge value.
                      const distNorm = halfCanvas > 0
                        ? Math.min(1, Math.abs(cxCenter - halfCanvas) / halfCanvas)
                        : 0;
                      const borderScale = borderScaleEnabled
                        ? 1 + borderScaleAmplitude * distNorm
                        : 1;
                      // Compose all transforms around the letter's center via
                      // one translate-scale-rotate-translate sandwich. Combine
                      // border-scale (uniform) with effect's scaleY by multiplying.
                      const sX = borderScale;
                      const sY = borderScale * eff.scaleY;
                      const transforms: string[] = [];
                      if (eff.rotate !== 0 || sX !== 1 || sY !== 1) {
                        transforms.push(`translate(${cxCenter} ${cy})`);
                        if (eff.rotate !== 0) transforms.push(`rotate(${eff.rotate})`);
                        if (sX !== 1 || sY !== 1) transforms.push(`scale(${sX} ${sY})`);
                        transforms.push(`translate(${-cxCenter} ${-cy})`);
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

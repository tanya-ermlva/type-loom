/**
 * Vertical auto-fit math — pure functions, no React, no DOM.
 *
 * Two coupled fits:
 *   1. fitTextBlock — scales lineHeight + interLineGap so an N-line text block
 *      fills its canvas vertically (minus padding), centered.
 *   2. fitAtomsToStack — chooses an atom count and an adjusted atom canvas
 *      height so atoms tile the stack canvas exactly (no clipped partial atom
 *      at the bottom) and each atom's SVG viewBox aspect matches its slot
 *      aspect (no letterbox).
 *
 * Both are deterministic and easy to unit-test (see autoFit.test.ts).
 */

export interface TextBlockFit {
  lineHeight: number;
  interLineGap: number;
  topOffset: number;
}

export function fitTextBlock(
  canvasH: number,
  lineCount: number,
  rawLineHeight: number,
  rawInterLineGap: number,
  padding: number,
): TextBlockFit {
  // Degenerate: no lines → no scaling, place "origin" at canvas center so any
  // future renderer doesn't get a NaN top.
  if (lineCount <= 0) {
    return { lineHeight: rawLineHeight, interLineGap: rawInterLineGap, topOffset: canvasH / 2 };
  }

  // Clamp padding to keep target > 0. 0.5 would make target zero; 0.49 keeps
  // a sliver of room so scale math stays finite.
  const clampedPadding = Math.min(Math.max(padding, 0), 0.49);
  const target = canvasH * (1 - 2 * clampedPadding);

  // Natural block height at raw values. With negative gaps this can still be
  // positive (typical) but we guard the divisor anyway.
  const naturalTotalH =
    lineCount * rawLineHeight + Math.max(0, lineCount - 1) * rawInterLineGap;

  if (!isFinite(naturalTotalH) || naturalTotalH <= 0) {
    return { lineHeight: rawLineHeight, interLineGap: rawInterLineGap, topOffset: 0 };
  }

  const scale = target / naturalTotalH;
  const lineHeight = rawLineHeight * scale;
  const interLineGap = rawInterLineGap * scale;

  // After scaling, the actual block height equals `target`. Topoffset places
  // the block in the canvas's vertical center.
  const blockH = lineCount * lineHeight + Math.max(0, lineCount - 1) * interLineGap;
  const topOffset = (canvasH - blockH) / 2;

  return { lineHeight, interLineGap, topOffset };
}

export interface StackTileFit {
  atomCount: number;
  atomDisplayH: number;
  adjustedAtomCanvasH: number;
}

export function fitAtomsToStack(
  stackW: number,
  stackH: number,
  atomNaturalCanvasW: number,
  atomNaturalCanvasH: number,
): StackTileFit {
  // Degenerate inputs: return a single atom that fills the stack.
  if (stackW <= 0 || stackH <= 0 || atomNaturalCanvasW <= 0 || atomNaturalCanvasH <= 0) {
    return {
      atomCount: 1,
      atomDisplayH: Math.max(0, stackH),
      adjustedAtomCanvasH: Math.max(1, atomNaturalCanvasH),
    };
  }

  const naturalAtomDisplayH = stackW * (atomNaturalCanvasH / atomNaturalCanvasW);
  const ratio = stackH / naturalAtomDisplayH;
  // Round to nearest (not floor): if natural division is 7.09 → 7, 6.58 → 7,
  // distributing the remainder evenly across atoms instead of always clipping.
  const atomCount = Math.max(1, Math.round(ratio));
  const atomDisplayH = stackH / atomCount;

  // Match the atom's internal viewBox aspect to its rendered slot aspect, so
  // preserveAspectRatio="xMidYMid meet" doesn't introduce letterboxing.
  //   adjustedAtomCanvasH / atomNaturalCanvasW === atomDisplayH / stackW
  const adjustedAtomCanvasH = atomNaturalCanvasW * (atomDisplayH / stackW);

  return { atomCount, atomDisplayH, adjustedAtomCanvasH };
}

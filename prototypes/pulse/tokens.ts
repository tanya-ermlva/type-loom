import { useEffect, useState } from 'react';
import type { Line, Token } from './store';

// Punctuation that should be its own token even when adjacent to letters/digits.
const STANDALONE_PUNCTS = ['—', '–', '/', '|', '•']; // — – / | •
const PUNCT_RE = new RegExp(`(${STANDALONE_PUNCTS.map((p) => `\\${p}`).join('|')})`, 'g');

/**
 * Split a line of text into tokens. Whitespace is separator; standalone
 * punctuation is extracted as its own token even when adjacent to characters.
 */
export function tokenize(text: string, lineId: string): Token[] {
  const out: Token[] = [];
  const words = text.trim().split(/\s+/).filter(Boolean);
  let idx = 0;
  for (const w of words) {
    // Split this word on standalone punctuation, keeping the puncts.
    const parts = w.split(PUNCT_RE).filter(Boolean);
    for (const p of parts) {
      out.push({ id: `${lineId}-${idx}`, text: p });
      idx += 1;
    }
  }
  return out;
}

/** Per-letter offset within a token. `offsetX` is relative to the token's own start. */
export interface LetterMetric {
  char: string;
  offsetX: number;
  width: number;
}

export interface TokenMetrics {
  width: number;
  letters: LetterMetric[];
}

/**
 * Measure the rendered width of each token AND each character within it.
 *
 * Mounts a hidden SVG with one <text> per token, reads getBBox for the token
 * width and getStartPositionOfChar / getEndPositionOfChar for per-letter
 * offsets. The character offsets respect the active font, font-size, AND
 * letter-spacing — so the natural advance of the rendered text is preserved.
 *
 * Returns null while metrics are not yet known (first paint or after a font change).
 */
export function useTokenWidths(
  lines: Line[],
  fontFamily: string,
  fontSize: number,
  letterSpacingPx: number,
): Map<string, TokenMetrics> | null {
  const [metrics, setMetrics] = useState<Map<string, TokenMetrics> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      // Wait for the font to be ready so first measurements aren't from fallback.
      try {
        await document.fonts.ready;
      } catch { /* ignore */ }
      if (cancelled) return;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('style', 'position:absolute;left:-99999px;top:0;visibility:hidden;');
      document.body.appendChild(svg);
      const map = new Map<string, TokenMetrics>();
      try {
        for (const line of lines) {
          for (const tok of line.tokens) {
            const t = document.createElementNS(NS, 'text') as SVGTextElement;
            t.setAttribute('x', '0');
            t.setAttribute('y', '0');
            t.setAttribute('font-family', fontFamily);
            t.setAttribute('font-size', String(fontSize));
            t.setAttribute('letter-spacing', String(letterSpacingPx));
            t.textContent = tok.text;
            svg.appendChild(t);
            const width = t.getBBox().width;
            const letters: LetterMetric[] = [];
            for (let i = 0; i < tok.text.length; i++) {
              try {
                const start = t.getStartPositionOfChar(i);
                const end = t.getEndPositionOfChar(i);
                letters.push({
                  char: tok.text[i],
                  offsetX: start.x,
                  width: end.x - start.x,
                });
              } catch {
                // Some browsers / jsdom may not implement the API for certain glyphs.
                letters.push({ char: tok.text[i], offsetX: 0, width: 0 });
              }
            }
            map.set(tok.id, { width, letters });
          }
        }
      } finally {
        svg.remove();
      }
      if (!cancelled) setMetrics(map);
    };
    measure();
    return () => { cancelled = true; };
  }, [lines, fontFamily, fontSize, letterSpacingPx]);

  return metrics;
}

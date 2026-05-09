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

/**
 * Measure the rendered width of each token by mounting a hidden SVG group
 * with the same font params and reading getBBox after the next layout pass.
 *
 * Returns null while widths are not yet known (first paint).
 */
export function useTokenWidths(
  lines: Line[],
  fontFamily: string,
  fontSize: number,
  letterSpacingPx: number,
): Map<string, number> | null {
  const [widths, setWidths] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const measure = async () => {
      // Wait for the font to be ready so first measurements aren't from fallback.
      try {
        await document.fonts.ready;
      } catch { /* ignore */ }
      if (cancelled) return;
      // Build an offscreen SVG with one hidden <text> per token.
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('style', 'position:absolute;left:-99999px;top:0;visibility:hidden;');
      document.body.appendChild(svg);
      const map = new Map<string, number>();
      try {
        for (const line of lines) {
          for (const tok of line.tokens) {
            const t = document.createElementNS(NS, 'text');
            t.setAttribute('font-family', fontFamily);
            t.setAttribute('font-size', String(fontSize));
            t.setAttribute('letter-spacing', String(letterSpacingPx));
            t.textContent = tok.text;
            svg.appendChild(t);
            const w = (t as SVGTextElement).getBBox().width;
            map.set(tok.id, w);
          }
        }
      } finally {
        svg.remove();
      }
      if (!cancelled) setWidths(map);
    };
    measure();
    return () => { cancelled = true; };
  }, [lines, fontFamily, fontSize, letterSpacingPx]);

  return widths;
}

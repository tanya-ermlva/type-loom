/**
 * PNG sequence export — shared between Atom (Pulse) and Stack.
 *
 * Workflow:
 *   1. Caller pauses animation and switches to "export" mode (drives `t` from frame index).
 *   2. For each frame, caller updates state, awaits two paints, then captures the live SVG.
 *   3. svgToPng inlines the @font-face (otherwise the OTF won't load when the SVG
 *      is drawn through an <img> element) and rasterises via canvas.
 *   4. Frames bundle into a single ZIP via JSZip and trigger a browser download.
 */
import JSZip from 'jszip';
import fontOtfUrl from './fonts/NHaasGroteskDSPro-65Md.otf?url';

const SVG_NS = 'http://www.w3.org/2000/svg';

let fontFaceCssCache: string | null = null;

/** Fetch the OTF and produce a self-contained @font-face declaration with embedded base64. */
async function getFontFaceCss(): Promise<string> {
  if (fontFaceCssCache) return fontFaceCssCache;
  const res = await fetch(fontOtfUrl);
  if (!res.ok) throw new Error(`Failed to fetch font: ${res.status}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let chars = '';
  // Chunk to avoid String.fromCharCode stack overflow on large arrays.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chars += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  const b64 = btoa(chars);
  fontFaceCssCache = `@font-face { font-family: 'NHaas Grotesk Display Pro'; src: url('data:font/otf;base64,${b64}') format('opentype'); font-weight: 500; font-style: normal; font-display: block; }`;
  return fontFaceCssCache;
}

/**
 * Rasterise an SVG element to a PNG Blob at `width × height` (defaults to viewBox size).
 * Inlines the font @font-face into the SVG so the rendered PNG uses NHaas Grotesk.
 */
export async function svgToPng(svg: SVGSVGElement, width?: number, height?: number): Promise<Blob> {
  const fontCss = await getFontFaceCss();
  const clone = svg.cloneNode(true) as SVGSVGElement;

  // Insert <defs><style>@font-face{...}</style></defs> at the top.
  const defs = document.createElementNS(SVG_NS, 'defs');
  const styleEl = document.createElementNS(SVG_NS, 'style');
  styleEl.textContent = fontCss;
  defs.appendChild(styleEl);
  clone.insertBefore(defs, clone.firstChild);

  const vb = svg.viewBox?.baseVal;
  const w = width ?? vb?.width ?? svg.clientWidth ?? 1920;
  const h = height ?? vb?.height ?? svg.clientHeight ?? 1080;
  // Force absolute sizes on the clone so the <img> rasterises at full resolution.
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));

  const xml = new XMLSerializer().serializeToString(clone);
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(new Error(`Image load failed: ${e}`));
    i.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob produced null'))),
      'image/png',
    );
  });
}

/** Wait for one full paint cycle (state commit + browser paint). */
export function waitForPaint(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

/** Trigger browser download of a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface SequenceExportOpts {
  frames: number;
  fps: number;
  zipName: string;
  /** Called for each frame index (0..frames-1). Should set state so SVG re-renders. */
  prepareFrame: (frameIdx: number) => void;
  /** Returns the live SVG to capture for the current frame, or null to skip. */
  getSvg: () => SVGSVGElement | null;
  /** Optional explicit width/height for the rasterised PNG. */
  width?: number;
  height?: number;
  /** Called with progress fraction (0..1) after each frame. */
  onProgress?: (p: number) => void;
}

/** High-level: drive state through frames, capture each, bundle to ZIP, download. */
export async function exportPngSequence(opts: SequenceExportOpts): Promise<void> {
  const { frames, zipName, prepareFrame, getSvg, width, height, onProgress } = opts;
  void opts.fps; // fps is supplied for prepareFrame's use; not needed here directly
  const zip = new JSZip();
  for (let f = 0; f < frames; f++) {
    prepareFrame(f);
    await waitForPaint();
    const svg = getSvg();
    if (!svg) continue;
    const png = await svgToPng(svg, width, height);
    zip.file(`frame-${String(f).padStart(4, '0')}.png`, png);
    onProgress?.((f + 1) / frames);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, zipName);
}

import type { Row } from './types';

/**
 * Render a set of rows to a 2D canvas context. This is the export-time
 * counterpart to the SVG renderer in components/Canvas.tsx — same letter
 * data, drawn with native canvas calls (no field overlays / handles).
 *
 * Caller is responsible for sizing the canvas correctly (we don't clear
 * or resize here so the caller can stack multiple draw passes if needed).
 */
export function renderRows(
  ctx: CanvasRenderingContext2D,
  rows: Row[],
  letterSize: number,
  fg: string,
  bg: string,
  width: number,
  height: number,
): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = fg;
  ctx.font = `700 ${letterSize}px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const row of rows) {
    for (const letter of row) {
      ctx.fillText(letter.char, letter.x, letter.y);
    }
  }
}

/**
 * Export the live SVG element as PNG. Clones the SVG, strips interactive
 * field handles, serializes, loads via Image, draws onto canvas with the
 * given background color, then triggers a PNG download.
 *
 * Goes through SVG (instead of the canvas-based renderRows) so word blob
 * filters and any future SVG-only effects survive the export.
 */
export async function exportPngFromSvg(
  svg: SVGSVGElement,
  width: number,
  height: number,
  bgColor: string,
  filename = 'compress.png',
): Promise<void> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Strip interactive overlays (move handles, force/target ghosts, resize
  // squares) — they're for editing, not for the printed output.
  clone.querySelectorAll('.field-handle').forEach((el) => el.remove());
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // Inject a background rect so the exported PNG has the canvas color
  // baked in. SVG has no intrinsic background; without this the PNG would
  // be transparent under the type.
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('fill', bgColor);
  clone.insertBefore(bgRect, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('No 2D context'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) downloadBlob(blob, filename);
          resolve();
        }, 'image/png');
      };
      img.onerror = () => reject(new Error('SVG image failed to load'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Trigger a download for a Blob with the given filename. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Render rows onto a fresh offscreen canvas and download as PNG.
 */
export function exportPng(
  rows: Row[],
  letterSize: number,
  fg: string,
  bg: string,
  width: number,
  height: number,
  filename = 'compress.png',
): void {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  renderRows(ctx, rows, letterSize, fg, bg, width, height);
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, 'image/png');
}

// ---------- Video export ----------

export type VideoFormat = 'webm' | 'mp4';

/** Best supported MediaRecorder mime for the requested container. */
export function pickMimeType(format: VideoFormat): string | null {
  const candidates = format === 'mp4'
    ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=h264', 'video/mp4']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/**
 * Record a canvas as video for `durationSeconds`, then trigger a download.
 * The caller drives the canvas's animation loop; we just capture frames.
 */
export async function exportVideo(
  canvas: HTMLCanvasElement,
  durationSeconds: number,
  format: VideoFormat = 'mp4',
  fps = 30,
  filename?: string,
): Promise<void> {
  const mimeType = pickMimeType(format);
  if (!mimeType) {
    throw new Error(
      `${format.toUpperCase()} export isn't supported in this browser. Try WebM.`,
    );
  }

  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  recorder.start();
  await new Promise((r) => setTimeout(r, durationSeconds * 1000));
  recorder.stop();
  await stopped;

  const blob = new Blob(chunks, { type: mimeType });
  downloadBlob(blob, filename ?? `compress.${format}`);
}

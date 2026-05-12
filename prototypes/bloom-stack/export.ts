/**
 * PNG export for a single bloom-stack frame.
 *
 * Bloom-stack SVGs are pure circles — no text, no font dependencies — so the
 * rasterisation path is simpler than pulse's: clone the SVG, serialize, draw
 * through an Image into a canvas at viewBox resolution, toBlob, download.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Rasterise an SVG element to a PNG Blob at its viewBox resolution. The
 * cloned SVG gets explicit width/height attributes so the browser doesn't
 * fall back to 0×0 when the rasterising <img> consumes the data URL.
 */
async function svgToPng(svg: SVGSVGElement, width: number, height: number): Promise<Blob> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  // Ensure xmlns is present on the serialized root — required by some
  // browsers for the inline data URL to render correctly.
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS);

  const xml = new XMLSerializer().serializeToString(clone);
  const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = (e) => reject(new Error(`Image load failed: ${e}`));
    i.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');
  ctx.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob produced null'))),
      'image/png',
    );
  });
}

/** Trigger a browser download of a Blob with the given filename. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export the given SVG as a PNG file at viewBox-native resolution.
 * Filename includes the composition name and a short timestamp.
 */
export async function exportSvgAsPng(
  svg: SVGSVGElement,
  compositionId: string,
): Promise<void> {
  const vb = svg.viewBox?.baseVal;
  const width = vb?.width || 1920;
  const height = vb?.height || 1080;
  const blob = await svgToPng(svg, width, height);
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadBlob(blob, `bloom-stack-${compositionId}-${ts}.png`);
}

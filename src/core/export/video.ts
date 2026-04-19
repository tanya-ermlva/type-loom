/**
 * Container format the user can request for a video export.
 * - 'webm': always available (vp9/vp8 codec)
 * - 'mp4':  available in modern Chromium-based browsers (h.264 codec)
 *
 * MOV is essentially MP4 with a different container; design tools (After
 * Effects, Premiere, Final Cut, DaVinci) handle MP4 just as well as MOV,
 * so an MP4 download serves the same workflow.
 */
export type VideoFormat = 'webm' | 'mp4';

/**
 * Pick the best supported MediaRecorder mime type for the requested format.
 * Returns null if the format isn't supported in this browser.
 */
export function pickMimeType(format: VideoFormat): string | null {
  const candidates = format === 'mp4'
    ? ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=h264', 'video/mp4']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/**
 * Record a canvas as video for `durationSeconds`, then trigger a download.
 * Uses the browser's MediaRecorder API on `canvas.captureStream`.
 *
 * The caller is responsible for ensuring the canvas is animating
 * (i.e. the playback loop is running) for the recording window.
 */
export async function exportCanvasAsVideo(
  canvas: HTMLCanvasElement,
  durationSeconds: number,
  format: VideoFormat = 'webm',
  fps = 30,
): Promise<void> {
  const mimeType = pickMimeType(format);
  if (!mimeType) {
    throw new Error(
      `${format.toUpperCase()} export is not supported in this browser. Try WebM or PNG sequence.`,
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
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `type-loom.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

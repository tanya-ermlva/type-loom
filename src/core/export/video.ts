/**
 * Record a canvas as a WebM video for `durationSeconds`, then trigger a
 * download. Uses the browser's MediaRecorder API on `canvas.captureStream`.
 *
 * The caller is responsible for ensuring the canvas is animating (i.e.
 * the playback loop is running) for the recording window.
 */
export async function exportCanvasAsWebm(
  canvas: HTMLCanvasElement,
  durationSeconds: number,
  fps = 30,
  filename = 'type-loom.webm',
): Promise<void> {
  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];

  // Pick the best supported codec.
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

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
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

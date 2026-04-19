/**
 * Load a user-supplied font file (.otf / .ttf / .woff / .woff2) and
 * register it with the document so canvas rendering can reference it
 * via `ctx.font = "<size>px <family>"`.
 *
 * Returns a `font-family` string ready to drop into BaseGridConfig.fontFamily.
 */
export async function loadFontFile(file: File): Promise<{ family: string; cssFamily: string }> {
  const buffer = await file.arrayBuffer();
  // Build a stable family name derived from filename + timestamp so
  // repeat uploads don't collide.
  const base = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '-');
  const family = `tl-${base || 'font'}-${Date.now().toString(36)}`;

  const face = new FontFace(family, buffer);
  await face.load();
  document.fonts.add(face);

  return {
    family,
    cssFamily: `"${family}", system-ui, sans-serif`,
  };
}

/**
 * Best-effort display name for a font-family CSS value (strips fallbacks
 * and quotes for the UI label).
 */
export function displayFontName(cssFamily: string): string {
  const first = cssFamily.split(',')[0]?.trim() ?? cssFamily;
  return first.replace(/^["']|["']$/g, '');
}

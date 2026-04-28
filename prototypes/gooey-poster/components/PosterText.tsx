import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { usePosterStore } from '../store';
import { cursorMaskStyle } from '../lib/maskStyles';

// PosterText is the visual body of the poster. Two text layers stacked:
//   - Layer 1 (clean) — text rendered normally, always visible.
//   - Layer 2 (gooey) — same text with `filter: url(#gooey-poster-filter)`,
//     masked by --cursor-mask so it only shows where the cursor blob (and
//     trail) covers. Where the gooey layer is masked out, the clean layer
//     shows through. Same text in both layers means glyphs align exactly.
//
// Double-click swaps in a contenteditable div for inline text editing.
export function PosterText() {
  const poster = usePosterStore((s) => s.poster);
  const setText = usePosterStore((s) => s.setText);

  const [editing, setEditing] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing) editRef.current?.focus();
  }, [editing]);

  const baseStyle: CSSProperties = {
    fontFamily:
      poster.font.kind === 'custom'
        ? `"${poster.font.name}", system-ui, sans-serif`
        : 'system-ui, -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    fontSize: `${poster.fontSize}px`,
    lineHeight: poster.lineHeight,
    color: poster.textColor,
    textAlign: poster.textAlign,
    fontWeight: poster.fontWeight,
    letterSpacing: '-0.02em',
  };

  if (editing) {
    return (
      <div
        ref={editRef}
        className="poster-text"
        contentEditable
        suppressContentEditableWarning
        style={baseStyle}
        onBlur={(e) => {
          setText((e.target as HTMLElement).innerText);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') (e.target as HTMLElement).blur();
        }}
      >
        {poster.text}
      </div>
    );
  }

  return (
    <>
      <p
        className="poster-text layer-clean"
        style={baseStyle}
        onDoubleClick={() => setEditing(true)}
      >
        {poster.text}
      </p>
      <p
        className="poster-text layer-gooey"
        style={{ ...baseStyle, ...cursorMaskStyle(), pointerEvents: 'none' }}
      >
        {poster.text}
      </p>
    </>
  );
}

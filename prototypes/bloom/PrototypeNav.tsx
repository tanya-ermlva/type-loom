/**
 * PrototypeNav — header dropdown for switching between Bloom-family views.
 *
 * Mirrors prototypes/pulse/PrototypeNav so the hub feels coherent across
 * prototype families. Lives in bloom/ so both bloom and bloom-stack can
 * import it via relative path. Each entry knows its URL (relative to
 * /prototypes/) and whether it's clickable; disabled entries appear
 * greyed-out as "coming soon" placeholders that we can wire up later
 * without touching the consumers.
 */
import { useEffect, useRef, useState } from 'react';

type View = 'atom' | 'stack' | 'marquee' | 'polotno';

interface Entry {
  view: View;
  label: string;
  href: string | null; // null = not yet built
}

const ENTRIES: Entry[] = [
  { view: 'atom',    label: 'Atom',    href: '../bloom/' },
  { view: 'stack',   label: 'Stack',   href: '../bloom-stack/' },
  { view: 'marquee', label: 'Marquee', href: null },
  { view: 'polotno', label: 'Polotno', href: null },
];

export function PrototypeNav({ current }: { current: View }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const currentLabel = ENTRIES.find((e) => e.view === current)?.label ?? 'Atom';

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', userSelect: 'none' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent', border: 0, padding: '4px 8px',
          color: '#ffffff', fontSize: 22, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          letterSpacing: '-0.01em',
        }}
      >
        <span>{currentLabel}</span>
        <span style={{ fontSize: 12, opacity: 0.85 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 8,
          background: 'transparent',
          padding: '4px 0',
          display: 'flex', flexDirection: 'column', gap: 2,
          minWidth: 120, zIndex: 50,
        }}>
          {ENTRIES.filter((e) => e.view !== current).map((e) => {
            const enabled = e.href !== null;
            const common: React.CSSProperties = {
              padding: '2px 8px',
              fontSize: 18, fontWeight: 600,
              letterSpacing: '-0.01em',
              textDecoration: 'none',
              color: enabled ? '#a1a1aa' : '#52525b',
              cursor: enabled ? 'pointer' : 'not-allowed',
            };
            return enabled ? (
              <a key={e.view} href={e.href!} style={common}>{e.label}</a>
            ) : (
              <span key={e.view} style={common} title="coming soon">{e.label}</span>
            );
          })}
        </div>
      )}
    </div>
  );
}

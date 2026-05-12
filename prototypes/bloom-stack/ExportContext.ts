/**
 * ExportContext — provides the live bloom-stack SVG to descendant components.
 *
 * Lives in its own module to break the App ↔ Sidebar import cycle: Sidebar
 * needs the context to wire up the PNG export button; App owns the SVG ref
 * and renders the provider; both import from here.
 */
import { createContext, useContext } from 'react';

export const ExportContext = createContext<{ getSvg: () => SVGSVGElement | null }>({
  getSvg: () => null,
});

export const useExportSvg = () => useContext(ExportContext);

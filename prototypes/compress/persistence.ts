import type { Field, GlobalParams } from './types';

/** Self-contained snapshot of everything needed to reproduce a poster.
 *  Animation state (isPlaying, progress) is intentionally NOT persisted
 *  per project — projects open paused at progress=0 always. */
export interface ProjectSnapshot {
  schemaVersion: 1;
  fields: Field[];
  globals: GlobalParams;
  selectedFieldId: string | null;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;     // ms epoch
  updatedAt: number;     // ms epoch
  thumbnail?: string;    // dataURL of small PNG (200×280-ish)
  snapshot: ProjectSnapshot;
}

interface StorageContents {
  projects: SavedProject[];
}

// Separate key from the auto-persist store ('compress-store-v1') so
// per-project saves don't collide with the running working state.
const STORAGE_KEY = 'compress:projects';

function read(): StorageContents {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [] };
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.projects) ? parsed : { projects: [] };
  } catch {
    return { projects: [] };
  }
}

function write(c: StorageContents): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch (err) {
    // localStorage quota exceeded → silent fail. The user might have many
    // big thumbnails saved; we just stop accepting new saves rather than
    // wipe their existing data.
    console.warn('Failed to write compress projects to localStorage', err);
  }
}

/** Most-recently-updated projects come first. */
export function listProjects(): SavedProject[] {
  return read().projects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): SavedProject | null {
  return read().projects.find((p) => p.id === id) ?? null;
}

/** Insert new project or update an existing one in place. */
export function saveProject(
  name: string,
  snapshot: ProjectSnapshot,
  thumbnail?: string,
  existingId?: string,
): SavedProject {
  const c = read();
  const now = Date.now();
  if (existingId) {
    const idx = c.projects.findIndex((p) => p.id === existingId);
    if (idx >= 0) {
      const updated: SavedProject = {
        ...c.projects[idx],
        name,
        updatedAt: now,
        thumbnail: thumbnail ?? c.projects[idx].thumbnail,
        snapshot,
      };
      c.projects[idx] = updated;
      write(c);
      return updated;
    }
  }
  const newProj: SavedProject = {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    thumbnail,
    snapshot,
  };
  c.projects.unshift(newProj);
  write(c);
  return newProj;
}

export function renameProject(id: string, name: string): void {
  const c = read();
  const p = c.projects.find((p) => p.id === id);
  if (p) {
    p.name = name;
    p.updatedAt = Date.now();
    write(c);
  }
}

export function deleteProject(id: string): void {
  const c = read();
  c.projects = c.projects.filter((p) => p.id !== id);
  write(c);
}

export function duplicateProject(id: string): SavedProject | null {
  const c = read();
  const orig = c.projects.find((p) => p.id === id);
  if (!orig) return null;
  const now = Date.now();
  const dup: SavedProject = {
    ...orig,
    id: crypto.randomUUID(),
    name: `${orig.name} copy`,
    createdAt: now,
    updatedAt: now,
  };
  c.projects.unshift(dup);
  write(c);
  return dup;
}

// ---------- Thumbnail generation ----------

/**
 * Render a small PNG thumbnail of the live SVG. Reuses the same SVG-to-img
 * pipeline as the PNG export, but at reduced resolution. Returns a data URL
 * suitable for storage alongside the project snapshot.
 */
export async function captureThumbnail(
  svg: SVGSVGElement,
  bgColor: string,
  width = 200,
  height = 280,
): Promise<string | undefined> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('.field-handle').forEach((el) => el.remove());

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  // viewBox dimensions (1190×1684) — bg rect must fill that, not display size.
  const viewBox = clone.getAttribute('viewBox')?.split(/\s+/).map(Number) ?? [0, 0, 1190, 1684];
  const [, , vbW, vbH] = viewBox;
  bgRect.setAttribute('width', String(vbW));
  bgRect.setAttribute('height', String(vbH));
  bgRect.setAttribute('fill', bgColor);
  clone.insertBefore(bgRect, clone.firstChild);

  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));

  try {
    return await new Promise<string | undefined>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(undefined);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(undefined);
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

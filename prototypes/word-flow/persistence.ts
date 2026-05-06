import type { Composition } from './flow';

export interface ProjectSnapshot {
  schemaVersion: 1;
  composition: Composition;
  selectedFlowId: string | null;
}

export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail?: string; // dataURL
  snapshot: ProjectSnapshot;
}

interface StorageContents {
  projects: SavedProject[];
}

const STORAGE_KEY = 'word-flow:projects';

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
    console.warn('Failed to write word-flow projects', err);
  }
}

export function listProjects(): SavedProject[] {
  return read().projects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

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
        name, updatedAt: now,
        thumbnail: thumbnail ?? c.projects[idx].thumbnail,
        snapshot,
      };
      c.projects[idx] = updated;
      write(c);
      return updated;
    }
  }
  const next: SavedProject = {
    id: crypto.randomUUID(),
    name, createdAt: now, updatedAt: now,
    thumbnail, snapshot,
  };
  c.projects.unshift(next);
  write(c);
  return next;
}

export function renameProject(id: string, name: string): void {
  const c = read();
  const p = c.projects.find((p) => p.id === id);
  if (p) { p.name = name; p.updatedAt = Date.now(); write(c); }
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
    createdAt: now, updatedAt: now,
  };
  c.projects.unshift(dup);
  write(c);
  return dup;
}

/** Capture a small PNG thumbnail of the live canvas. */
export function captureThumbnail(
  source: HTMLCanvasElement,
  longSide = 280,
): string | undefined {
  const sw = source.width;
  const sh = source.height;
  if (!sw || !sh) return undefined;
  // Preserve aspect by scaling down so the long side equals `longSide`.
  const scale = longSide / Math.max(sw, sh);
  const tw = Math.round(sw * scale);
  const th = Math.round(sh * scale);
  const off = document.createElement('canvas');
  off.width = tw;
  off.height = th;
  const ctx = off.getContext('2d');
  if (!ctx) return undefined;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, tw, th);
  return off.toDataURL('image/png');
}

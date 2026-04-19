import type { ProjectSnapshot } from './serialize';

export interface SavedProject {
  id: string;
  name: string;
  createdAt: number;     // ms epoch
  updatedAt: number;     // ms epoch
  thumbnail?: string;    // dataURL of small PNG
  snapshot: ProjectSnapshot;
}

interface StorageContents {
  projects: SavedProject[];
  draftSnapshot?: ProjectSnapshot;
}

const STORAGE_KEY = 'typeloom:projects';

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
    console.warn('Failed to write to localStorage', err);
  }
}

export function listProjects(): SavedProject[] {
  return read().projects.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): SavedProject | null {
  return read().projects.find((p) => p.id === id) ?? null;
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
  const copy: SavedProject = {
    ...orig,
    id: crypto.randomUUID(),
    name: `${orig.name} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  c.projects.unshift(copy);
  write(c);
  return copy;
}

export function getDraft(): ProjectSnapshot | null {
  return read().draftSnapshot ?? null;
}

export function saveDraft(snap: ProjectSnapshot): void {
  const c = read();
  c.draftSnapshot = snap;
  write(c);
}

export function clearDraft(): void {
  const c = read();
  delete c.draftSnapshot;
  write(c);
}

/**
 * Render the current canvas to a small PNG dataURL for use as a thumbnail.
 * Preserves aspect ratio; the longer edge maxes at `maxSize`.
 */
export function captureThumbnail(canvas: HTMLCanvasElement, maxSize = 240): string {
  const aspectRatio = canvas.width / canvas.height;
  let w = maxSize;
  let h = maxSize;
  if (aspectRatio > 1) h = Math.round(maxSize / aspectRatio);
  else w = Math.round(maxSize * aspectRatio);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, w, h);
  return off.toDataURL('image/png');
}

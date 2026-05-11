/**
 * Projects (named saved compositions) — shared by Pulse + Stack.
 *
 * A "project" is a named snapshot of BOTH stores together — Pulse composition
 * and Stack settings. Saved to localStorage as a single JSON list under
 * `type-loom:projects`. The currently-loaded project id (if any) lives at
 * `type-loom:active-project`.
 *
 * Live workspace (the `pulse:state` / `stack:state` keys written by Zustand
 * persist) is never touched here — it's always whatever the user is editing.
 * Loading a project REPLACES the workspace; saving a project COPIES from it.
 *
 * Why combined snapshots? Stack reads Pulse's composition live, so any
 * "project" really spans both stores — saving them together is the only way
 * to recall a coherent design. Each store stays single-tenant and unaware
 * of the project layer; this module is the only thing that knows the keys.
 */
import { useStore as usePulseStore, type Composition } from '../pulse/store';
import { useStore as useStackStore } from '../stack/store';

/**
 * Backfill defaults for fields that may be missing from older project snapshots.
 * Legacy snapshots saved before the auto-fit feature won't have `autoFitVertical`
 * / `autoFitPadding`; default the toggle OFF so the project's designed look is
 * preserved exactly.
 */
function withLegacyDefaults(saved: unknown): Composition {
  const s = (saved as Partial<Composition>) ?? {};
  return {
    ...(s as Composition),
    autoFitVertical: s.autoFitVertical ?? false,
    autoFitPadding: s.autoFitPadding ?? 0.05,
  };
}

const PROJECTS_KEY = 'type-loom:projects';
const ACTIVE_KEY = 'type-loom:active-project';

export interface Project {
  id: string;        // millisecond timestamp; unique within a user's localStorage
  name: string;
  savedAt: string;   // ISO string for display + sorting
  /** Snapshot of Pulse store's persisted slice (the `composition` field). */
  pulse: { composition: unknown };
  /** Snapshot of Stack store's full persisted slice. */
  stack: Record<string, unknown>;
}

// ---------- Storage helpers ----------

function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Project[];
  } catch {
    return [];
  }
}

function writeProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

// ---------- Public API ----------

/** Returns all saved projects sorted by most recently saved first. */
export function listProjects(): Project[] {
  return readProjects().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/** Get the id of the currently-active project (one that's loaded), or null. */
export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

function setActiveProjectId(id: string | null): void {
  if (id === null) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, id);
  // Notify subscribers of activity change (no built-in event for setItem).
  window.dispatchEvent(new CustomEvent('type-loom:projects:change'));
}

/**
 * Capture the current live state of both stores and save as a new project.
 * Returns the created project. Becomes the active project.
 */
export function saveCurrentAsProject(name: string): Project {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Project name cannot be empty');

  const pulseState = usePulseStore.getState();
  const stackState = useStackStore.getState();

  const project: Project = {
    id: `p_${Date.now().toString(36)}`,
    name: trimmed,
    savedAt: new Date().toISOString(),
    // Mirror each store's `partialize` shape: only the data fields, no actions.
    pulse: { composition: pulseState.composition },
    stack: {
      canvasPreset: stackState.canvasPreset,
      stackCanvasWidth: stackState.stackCanvasWidth,
      stackCanvasHeight: stackState.stackCanvasHeight,
      bgColor: stackState.bgColor,
      cycleDuration: stackState.cycleDuration,
      pulsesPerScroll: stackState.pulsesPerScroll,
      scrollEasing: stackState.scrollEasing,
      scrollEasingCurve: stackState.scrollEasingCurve,
      playing: stackState.playing,
      scrollEnabled: stackState.scrollEnabled,
      atomPalette: stackState.atomPalette,
      atomAlignmentOverrides: stackState.atomAlignmentOverrides,
      phaseMode: stackState.phaseMode,
      phaseStep: stackState.phaseStep,
      phaseSpread: stackState.phaseSpread,
    },
  };

  const projects = readProjects();
  projects.push(project);
  writeProjects(projects);
  setActiveProjectId(project.id);
  return project;
}

/**
 * Overwrite an existing project with the current live state.
 * No-op (returns null) if the id doesn't exist.
 */
export function overwriteProject(id: string): Project | null {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return null;

  const pulseState = usePulseStore.getState();
  const stackState = useStackStore.getState();
  const updated: Project = {
    ...projects[idx],
    savedAt: new Date().toISOString(),
    pulse: { composition: pulseState.composition },
    stack: {
      canvasPreset: stackState.canvasPreset,
      stackCanvasWidth: stackState.stackCanvasWidth,
      stackCanvasHeight: stackState.stackCanvasHeight,
      bgColor: stackState.bgColor,
      cycleDuration: stackState.cycleDuration,
      pulsesPerScroll: stackState.pulsesPerScroll,
      scrollEasing: stackState.scrollEasing,
      scrollEasingCurve: stackState.scrollEasingCurve,
      playing: stackState.playing,
      scrollEnabled: stackState.scrollEnabled,
      atomPalette: stackState.atomPalette,
      atomAlignmentOverrides: stackState.atomAlignmentOverrides,
      phaseMode: stackState.phaseMode,
      phaseStep: stackState.phaseStep,
      phaseSpread: stackState.phaseSpread,
    },
  };
  projects[idx] = updated;
  writeProjects(projects);
  // Bump the change event so dropdowns re-render (e.g., updated savedAt).
  window.dispatchEvent(new CustomEvent('type-loom:projects:change'));
  return updated;
}

/**
 * Load a project: replace both stores' state with the project's snapshot.
 * Persist middleware will mirror the change into pulse:state / stack:state.
 * No-op if id doesn't exist.
 */
export function loadProject(id: string): boolean {
  const projects = readProjects();
  const proj = projects.find((p) => p.id === id);
  if (!proj) return false;

  // Partial setState merges → keeps actions, replaces persisted data fields.
  // (Zustand `setState(partial)` is shallow-merge.)
  if (proj.pulse?.composition) {
    usePulseStore.setState({ composition: withLegacyDefaults(proj.pulse.composition) as never });
  }
  if (proj.stack) {
    useStackStore.setState(proj.stack as never);
  }
  setActiveProjectId(id);
  return true;
}

/** Rename a project. No-op if id doesn't exist or new name is empty. */
export function renameProject(id: string, newName: string): boolean {
  const trimmed = newName.trim();
  if (!trimmed) return false;
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  projects[idx] = { ...projects[idx], name: trimmed };
  writeProjects(projects);
  window.dispatchEvent(new CustomEvent('type-loom:projects:change'));
  return true;
}

/** Delete a project. If it was active, clears the active id. */
export function deleteProject(id: string): boolean {
  const projects = readProjects();
  const idx = projects.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  projects.splice(idx, 1);
  writeProjects(projects);
  if (getActiveProjectId() === id) setActiveProjectId(null);
  else window.dispatchEvent(new CustomEvent('type-loom:projects:change'));
  return true;
}

/** Clear active id WITHOUT touching workspace state — return to "unsaved working". */
export function deactivateProject(): void {
  setActiveProjectId(null);
}

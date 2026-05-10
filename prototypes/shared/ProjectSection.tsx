/**
 * ProjectSection — shared sidebar UI for saving/loading named projects.
 *
 * Used by both Pulse and Stack sidebars at the very top, so the user can
 * manage projects from either prototype. Operates on both stores via the
 * `projects` module (project = combined Pulse + Stack snapshot).
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import {
  listProjects, getActiveProjectId, saveCurrentAsProject, overwriteProject,
  loadProject, renameProject, deleteProject, deactivateProject,
  type Project,
} from './projects';

/**
 * Subscribe to project list / active id changes. Re-runs the read whenever
 * the `type-loom:projects:change` custom event fires (dispatched by every
 * mutation in the projects module). Cheap; storage is small.
 */
function useProjects(): { projects: Project[]; activeId: string | null } {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    window.addEventListener('type-loom:projects:change', listener);
    return () => window.removeEventListener('type-loom:projects:change', listener);
  }, []);
  // version is intentionally part of the read so React re-derives on bump.
  void version;
  return { projects: listProjects(), activeId: getActiveProjectId() };
}

interface Props {
  /** Sidebar wraps this in its own Section component; we accept the wrapper. */
  Section: React.FC<{ title: string; children: ReactNode }>;
}

export function ProjectSection({ Section }: Props) {
  const { projects, activeId } = useProjects();
  const active = activeId ? projects.find((p) => p.id === activeId) ?? null : null;

  const onSelect = (val: string) => {
    if (val === '__new__') {
      const name = window.prompt('Project name:');
      if (!name) return;
      saveCurrentAsProject(name);
      return;
    }
    if (val === '__unsaved__') {
      deactivateProject();
      return;
    }
    if (active && active.id !== val) {
      const ok = window.confirm(
        `Load project "${projects.find((p) => p.id === val)?.name}"?\n` +
        `Your current working state will be replaced (any unsaved changes lost).`,
      );
      if (!ok) return;
    }
    loadProject(val);
  };

  const onSaveOver = () => {
    if (!active) return;
    if (!window.confirm(`Overwrite "${active.name}" with current state?`)) return;
    overwriteProject(active.id);
  };

  const onRename = () => {
    if (!active) return;
    const next = window.prompt('Rename project:', active.name);
    if (next === null) return;
    renameProject(active.id, next);
  };

  const onDelete = () => {
    if (!active) return;
    if (!window.confirm(`Delete project "${active.name}"? This can't be undone.`)) return;
    deleteProject(active.id);
  };

  return (
    <Section title="Project">
      <select
        value={activeId ?? '__unsaved__'}
        onChange={(e) => onSelect(e.target.value)}
        style={selectStyle}
      >
        <option value="__unsaved__">— Working (unsaved) —</option>
        {projects.length > 0 && <optgroup label="Saved">
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </optgroup>}
        <option value="__new__">+ Save current as new project…</option>
      </select>
      {active ? (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          <button onClick={onSaveOver} style={miniBtnPrimary} title="Overwrite this project with current state">
            Save
          </button>
          <button onClick={onRename} style={miniBtn} title="Rename project">Rename</button>
          <button onClick={onDelete} style={miniBtnDanger} title="Delete project">Delete</button>
        </div>
      ) : (
        <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '6px 0 0' }}>
          Working state autosaves locally. Save it as a named project to keep it
          while you experiment elsewhere — projects span both Atom + Stack.
        </p>
      )}
      {active && (
        <p style={{ fontSize: 10, color: '#71717a', lineHeight: 1.4, margin: '8px 0 0' }}>
          Last saved: {new Date(active.savedAt).toLocaleString()}
        </p>
      )}
    </Section>
  );
}

const selectStyle: CSSProperties = {
  width: '100%', background: '#0a0a0a', color: '#e4e4e7',
  border: '1px solid #3f3f46', borderRadius: 4, padding: '4px 6px',
  fontSize: 11,
};
const miniBtnBase: CSSProperties = {
  flex: 1, padding: '4px 6px', fontSize: 10,
  border: 0, borderRadius: 3, cursor: 'pointer',
};
const miniBtn: CSSProperties = { ...miniBtnBase, background: '#27272a', color: '#e4e4e7' };
const miniBtnPrimary: CSSProperties = { ...miniBtnBase, background: '#1e293b', color: '#60a5fa' };
const miniBtnDanger: CSSProperties = { ...miniBtnBase, background: '#27272a', color: '#f87171' };

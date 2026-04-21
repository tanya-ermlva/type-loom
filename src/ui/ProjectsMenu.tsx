import { useEffect, useRef, useState, type RefObject } from 'react';
import { useStore } from '../state/store';
import { listProjects, captureThumbnail } from '../core/persistence/storage';
import { makeSnapshot } from '../core/persistence/serialize';
import { EXAMPLES } from '../core/presets/examples';
import type { SavedProject } from '../core/persistence/storage';

interface ProjectsMenuProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onOpenManage: () => void;
}

/**
 * Topbar dropdown: save/load projects + recent list + manage.
 */
export function ProjectsMenu({ canvasRef, onOpenManage }: ProjectsMenuProps) {
  const currentProjectId = useStore((s) => s.currentProjectId);
  const currentProjectName = useStore((s) => s.currentProjectName);
  const isDirty = useStore((s) => s.isDirty);
  const saveCurrentProject = useStore((s) => s.saveCurrentProject);
  const saveAsNewProject = useStore((s) => s.saveAsNewProject);
  const loadProject = useStore((s) => s.loadProject);
  const newProject = useStore((s) => s.newProject);

  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState<SavedProject[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setRecents(listProjects().slice(0, 6));
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const captureThumb = (): string | undefined => {
    if (!canvasRef.current) return undefined;
    try { return captureThumbnail(canvasRef.current); } catch { return undefined; }
  };

  const handleSave = () => {
    setOpen(false);
    if (currentProjectId) {
      saveCurrentProject(currentProjectName, captureThumb());
    } else {
      const name = prompt('Project name', currentProjectName === 'Untitled' ? '' : currentProjectName);
      if (!name?.trim()) return;
      saveAsNewProject(name.trim(), captureThumb());
    }
  };

  const handleSaveAs = () => {
    setOpen(false);
    const name = prompt('Save as new project — name?', '');
    if (!name?.trim()) return;
    saveAsNewProject(name.trim(), captureThumb());
  };

  const handleNew = () => {
    setOpen(false);
    if (isDirty && !confirm('Unsaved changes will be lost. Start new project?')) return;
    newProject();
  };

  const handleLoad = (id: string) => {
    setOpen(false);
    if (isDirty && !confirm('Unsaved changes will be lost. Load this project?')) return;
    loadProject(id);
  };

  const handleExportJson = () => {
    setOpen(false);
    const snap = makeSnapshot(useStore.getState());
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProjectName || 'untitled'}.typeloom.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    setOpen(false);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const txt = await file.text();
        const parsed = JSON.parse(txt);
        if (parsed?.schemaVersion !== 1) {
          alert('Unsupported project file (schema mismatch).');
          return;
        }
        useStore.getState().loadSnapshot(parsed);
      } catch (err) {
        alert(`Could not import: ${(err as Error).message}`);
      }
    };
    input.click();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2.5 py-1 text-xs rounded text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 flex items-center gap-1.5"
        title="Project menu"
      >
        <span className="truncate max-w-[180px]">{currentProjectName}</span>
        {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unsaved changes" />}
        <span className="text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-60 bg-white border border-gray-200 rounded shadow-md z-20 text-sm">
          <button onClick={handleSave} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
            {currentProjectId ? 'Save' : 'Save…'}
            {isDirty && <span className="text-gray-400 text-xs ml-1">(unsaved)</span>}
          </button>
          <button onClick={handleSaveAs} className="block w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100">
            Save as new…
          </button>
          <button onClick={handleNew} className="block w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100">
            New project
          </button>

          {recents.length > 0 && (
            <>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400">Recent</div>
              {recents.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleLoad(p.id)}
                  className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 truncate"
                  title={`Saved ${new Date(p.updatedAt).toLocaleString()}`}
                >
                  {p.name}
                </button>
              ))}
              <div className="border-t border-gray-100" />
            </>
          )}

          <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-gray-400">Examples</div>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.id}
              onClick={() => {
                setOpen(false);
                if (isDirty && !confirm('Unsaved changes will be lost. Load this example?')) return;
                useStore.getState().loadSnapshot(ex.snapshot);
              }}
              className="block w-full text-left px-3 py-1.5 hover:bg-gray-100 truncate"
              title={ex.description}
            >
              {ex.name}
            </button>
          ))}
          <div className="border-t border-gray-100" />

          <button onClick={() => { setOpen(false); onOpenManage(); }} className="block w-full text-left px-3 py-2 hover:bg-gray-100">
            Manage projects…
          </button>
          <div className="border-t border-gray-100" />
          <button onClick={handleExportJson} className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-xs text-gray-500">
            Export current as .json
          </button>
          <button onClick={handleImportJson} className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-xs text-gray-500">
            Import .json…
          </button>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import {
  listProjects,
  deleteProject,
  duplicateProject,
  renameProject,
  type SavedProject,
} from '../core/persistence/storage';

interface ProjectsModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Manage modal: thumbnail grid of every saved project with per-row
 * actions (Load, Rename, Duplicate, Delete).
 */
export function ProjectsModal({ open, onClose }: ProjectsModalProps) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const isDirty = useStore((s) => s.isDirty);
  const loadProject = useStore((s) => s.loadProject);

  useEffect(() => {
    if (!open) return;
    setProjects(listProjects());
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const refresh = () => setProjects(listProjects());

  const handleLoad = (id: string) => {
    if (isDirty && !confirm('Unsaved changes will be lost. Load this project?')) return;
    loadProject(id);
    onClose();
  };

  const handleRename = (p: SavedProject) => {
    const name = prompt('New name', p.name);
    if (!name?.trim() || name === p.name) return;
    renameProject(p.id, name.trim());
    refresh();
  };

  const handleDuplicate = (id: string) => {
    duplicateProject(id);
    refresh();
  };

  const handleDelete = (p: SavedProject) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    deleteProject(p.id);
    refresh();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Projects</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
            aria-label="Close"
          >×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {projects.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">
              No saved projects yet. Click <span className="font-mono">Save</span> in the
              project menu to save your current composition.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="border border-gray-200 rounded-md overflow-hidden bg-white flex flex-col"
                >
                  <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-gray-300 text-xs">no preview</span>
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                    <div className="text-sm font-medium text-gray-800 truncate" title={p.name}>{p.name}</div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(p.updatedAt).toLocaleString()}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <button
                        onClick={() => handleLoad(p.id)}
                        className="text-xs px-2 py-0.5 bg-gray-900 text-white rounded hover:bg-gray-700"
                      >Load</button>
                      <button
                        onClick={() => handleRename(p)}
                        className="text-xs px-2 py-0.5 text-gray-600 hover:text-gray-900"
                      >Rename</button>
                      <button
                        onClick={() => handleDuplicate(p.id)}
                        className="text-xs px-2 py-0.5 text-gray-600 hover:text-gray-900"
                      >Duplicate</button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-xs px-2 py-0.5 text-gray-600 hover:text-red-600 ml-auto"
                      >Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

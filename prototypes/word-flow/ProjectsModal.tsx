import { useEffect, useState } from 'react';
import { useStore } from './store';
import {
  deleteProject,
  duplicateProject,
  listProjects,
  renameProject,
  type SavedProject,
} from './persistence';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Grid of saved word-flow projects. Mirrors the compress prototype's
 *  modal — same actions (Load / Rename / Duplicate / Delete) and the same
 *  storage shape, just keyed under `word-flow:projects`. */
export function ProjectsModal({ open, onClose }: Props) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const loadSnapshot = useStore((s) => s.loadSnapshot);

  useEffect(() => {
    if (!open) return;
    setProjects(listProjects());
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const refresh = () => setProjects(listProjects());

  function handleLoad(p: SavedProject) {
    loadSnapshot(p.snapshot);
    onClose();
  }

  function handleDelete(p: SavedProject) {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    deleteProject(p.id);
    refresh();
  }

  function commitRename() {
    if (!renaming) return;
    const next = renaming.name.trim();
    if (next.length > 0) renameProject(renaming.id, next);
    setRenaming(null);
    refresh();
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-8"
      onClick={onClose}
      style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-[900px] max-h-[80vh] w-full overflow-hidden flex flex-col text-zinc-200"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center px-5 py-3 border-b border-zinc-800 text-sm">
          <h2 className="font-semibold">Projects</h2>
          <span className="ml-3 text-zinc-500 text-[11px]">
            {projects.length} saved
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-zinc-500 hover:text-zinc-200 text-xl leading-none"
            aria-label="Close"
          >×</button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {projects.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-12">
              No saved projects yet. Click <span className="text-zinc-300 font-mono">Save</span> in the toolbar to start.
            </p>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4">
            {projects.map((p) => {
              const w = p.snapshot.composition.canvas.width;
              const h = p.snapshot.composition.canvas.height;
              return (
                <div
                  key={p.id}
                  className="bg-zinc-950 border border-zinc-800 rounded overflow-hidden flex flex-col"
                >
                  <button
                    onClick={() => handleLoad(p)}
                    className="bg-zinc-800 hover:opacity-90 transition-opacity"
                    style={{ aspectRatio: `${w} / ${h}` }}
                    title="Load this project"
                  >
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                        no preview
                      </div>
                    )}
                  </button>
                  <div className="px-2.5 py-2 text-[11px]">
                    {renaming?.id === p.id ? (
                      <input
                        autoFocus
                        value={renaming.name}
                        onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-100"
                      />
                    ) : (
                      <div
                        className="text-zinc-200 truncate cursor-text"
                        onDoubleClick={() => setRenaming({ id: p.id, name: p.name })}
                        title="Double-click to rename"
                      >
                        {p.name}
                      </div>
                    )}
                    <div className="text-zinc-500 text-[10px] mt-0.5">
                      {new Date(p.updatedAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                      <button
                        onClick={() => handleLoad(p)}
                        className="text-blue-400 hover:text-blue-300"
                      >Load</button>
                      <button
                        onClick={() => setRenaming({ id: p.id, name: p.name })}
                        className="text-zinc-500 hover:text-zinc-200"
                      >Rename</button>
                      <button
                        onClick={() => { duplicateProject(p.id); refresh(); }}
                        className="text-zinc-500 hover:text-zinc-200"
                      >Dup</button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="ml-auto text-zinc-500 hover:text-red-400"
                      >Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

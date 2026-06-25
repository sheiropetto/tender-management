"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, FileText, MoreHorizontal, Loader2, Clock, Pencil, Trash2, FileDown, Star, Archive } from "lucide-react";
import Link from "next/link";
import { getProjects, deleteProject, toggleProjectStar, archiveProject, type Project } from "@/lib/firestoreService";
import ConfirmModal from "@/components/ConfirmModal";

function formatTimeAgo(date: any): string {
  if (!date?.toDate) return "just now";
  const diff = Date.now() - date.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toDate().toLocaleDateString();
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    getProjects()
      .then((projs) => setProjects(projs.filter((p) => !p.archived)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleArchive = async () => {
    if (!archiveTarget?.id) return;
    setArchiving(true);
    try {
      await archiveProject(archiveTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== archiveTarget.id));
      setArchiveTarget(null);
    } catch (err) {
      console.error("Failed to archive project:", err);
    } finally {
      setArchiving(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-id]')) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStar = useCallback(async (projectId: string, starred: boolean) => {
    if (!projectId) return;
    try {
      await toggleProjectStar(projectId, starred);
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, starred } : p
      ));
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-900">Projects</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            All your tender document projects.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
            <FileText className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-medium text-zinc-800">No projects yet</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Create your first tender project to get started.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Plus className="h-4 w-4" />
            Create Project
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group rounded-xl border border-zinc-200 bg-white transition-all duration-150 hover:bg-zinc-50">
              <Link
                href={`/projects/${project.id}`}
                className="block p-5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400">
                    <FileText className="h-5 w-5 stroke-[1.5]" />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-zinc-800 leading-snug">{project.shortName || project.name}</h3>
                {project.refNumber && (
                  <p className="mt-0.5 text-xs text-zinc-400">{project.refNumber}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-400">
                    {project.hasEnvelopes ? "With Envelopes" : "Direct"}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                    {formatTimeAgo(project.updatedAt)}
                  </span>
                </div>
              </Link>

              {/* Star + Three-dot menu */}
              <div data-menu-id={project.id} className="absolute top-3 right-3 flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(project.id!, !project.starred);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    project.starred
                      ? 'text-zinc-600 hover:text-zinc-800'
                      : 'text-zinc-200 opacity-0 group-hover:opacity-100 hover:text-zinc-600'
                  }`}
                  title={project.starred ? "Unstar" : "Star"}
                >
                  <Star className={`h-4 w-4 stroke-[1.5] ${project.starred ? 'fill-zinc-600' : ''}`} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(openMenu === project.id ? null : project.id!);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4 stroke-[1.5]" />
                </button>
                {openMenu === project.id && (
                  <div className="absolute right-0 top-10 z-10 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        setTimeout(() => { window.location.href = `/projects/${project.id}/print`; }, 50);
                      }}
                      className="flex w-full items-center justify-start gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <FileDown className="h-4 w-4 stroke-[1.5]" />
                      Print Documents
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        setTimeout(() => { window.location.href = `/projects/${project.id}/edit`; }, 50);
                      }}
                      className="flex w-full items-center justify-start gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <Pencil className="h-4 w-4 stroke-[1.5]" />
                      Edit
                    </button>
                      <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        setArchiveTarget(project);
                      }}
                      className="flex w-full items-center justify-start gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <Archive className="h-4 w-4 stroke-[1.5]" />
                      Archive
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(null);
                        setDeleteTarget(project);
                      }}
                      className="flex w-full items-center justify-start gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <Trash2 className="h-4 w-4 stroke-[1.5]" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* Archive confirmation modal */}
      {archiveTarget && (
        <ConfirmModal
          title="Archive Project"
          message={`Are you sure you want to archive "${archiveTarget.name}"? You can restore it later from the Archive page.`}
          confirmLabel="Archive"
          loadingLabel="Archiving..."
          confirmVariant="primary"
          onConfirm={handleArchive}
          onCancel={() => setArchiveTarget(null)}
          loading={archiving}
        />
      )}
    </div>
  );
}

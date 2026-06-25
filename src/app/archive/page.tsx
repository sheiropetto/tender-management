"use client";

import { useEffect, useState, useCallback } from "react";
import { Archive, FileText, MoreHorizontal, Loader2, Clock, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { getProjects, deleteProject, unarchiveProject, type Project } from "@/lib/firestoreService";
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

export default function ArchivePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getProjects()
      .then((projs) => setProjects(projs.filter((p) => p.archived)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const handleRestore = async (projectId: string) => {
    try {
      await unarchiveProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("Failed to restore project:", err);
    }
  };

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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-900">Archive</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            All your archived projects. You can restore or delete them permanently.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
            <Archive className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-medium text-zinc-800">No archived projects</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Projects you archive will appear here.
          </p>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group rounded-xl border border-zinc-200 bg-white transition-all duration-150 hover:bg-zinc-50">
              <div className="block p-5">
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
              </div>

              {/* Three-dot options menu */}
              <div data-menu-id={project.id} className="absolute top-3 right-3 flex items-center gap-0.5">
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
                        handleRestore(project.id!);
                      }}
                      className="flex w-full items-center justify-start gap-2 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors text-left"
                    >
                      <RotateCcw className="h-4 w-4 stroke-[1.5]" />
                      Restore Project
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
                      Delete Permanently
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
          title="Delete Project Permanently"
          message={`Are you sure you want to permanently delete "${deleteTarget.name}"? This action is irreversible and will delete all associated data.`}
          confirmLabel="Delete Permanently"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}

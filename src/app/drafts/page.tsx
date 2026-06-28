"use client";

import { useEffect, useState } from "react";
import { FileText, Clock, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { getProjects, type Project } from "@/lib/firestoreService";

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

export default function DraftsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then((projs) => setProjects(projs.filter((p) => p.status === "draft" && !p.archived)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-zinc-900">Drafts</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Projects that are still in draft.
        </p>
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
          <h3 className="text-sm font-medium text-zinc-800">No drafts</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Your draft projects will appear here.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Pencil className="h-4 w-4 stroke-[1.5]" />
            Create New Project
          </Link>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="relative group rounded-xl border border-zinc-200 bg-white transition-all duration-150 hover:bg-zinc-50">
              <Link href={`/projects/${project.id}`} className="block p-5">
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
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                    Draft
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                    {formatTimeAgo(project.updatedAt)}
                  </span>
                </div>
              </Link>
              <Link
                href={`/projects/${project.id}/edit`}
                className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-600 group-hover:opacity-100"
                title="Edit draft"
              >
                <Pencil className="h-4 w-4 stroke-[1.5]" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

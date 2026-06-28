"use client";

import { useEffect, useState, useCallback } from "react";
import { Star, FileText, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { getProjects, toggleProjectStar, type Project } from "@/lib/firestoreService";

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

export default function FavouritesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects()
      .then((projs) => setProjects(projs.filter((p) => p.starred && !p.archived)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleToggleStar = useCallback(async (projectId: string, starred: boolean) => {
    if (!projectId) return;
    try {
      await toggleProjectStar(projectId, starred);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-zinc-900">Favourites</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Your starred projects.
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
            <Star className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-medium text-zinc-800">No favourites yet</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Star your important projects to find them quickly.
          </p>
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
                  <span className="text-zinc-400">
                    {project.hasEnvelopes ? "With Envelopes" : "Direct"}
                  </span>
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                    {formatTimeAgo(project.updatedAt)}
                  </span>
                </div>
              </Link>

              {/* Unstar button */}
              <div className="absolute top-3 right-3 flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStar(project.id!, false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
                  title="Remove from favourites"
                >
                  <Star className="h-4 w-4 stroke-[1.5] fill-zinc-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

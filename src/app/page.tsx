"use client";

import { useEffect, useState } from "react";
import {
  Upload,
  FileDown,
  LayoutTemplate,
  Plus,
  FileText,
  Clock,
  Loader2,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { getProjects, type Project } from "@/lib/firestoreService";
import { seedSampleData } from "@/lib/seedData";

const quickActions = [
  {
    href: "/import",
    label: "Import Data",
    description: "Upload Excel or paste data",
    icon: Upload,
  },
  {
    href: "/export",
    label: "Generate TOC",
    description: "Create table of contents",
    icon: FileDown,
  },
  {
    href: "/export",
    label: "Generate Dividers",
    description: "Create document separators",
    icon: LayoutTemplate,
  },
  {
    href: "/import",
    label: "New Project",
    description: "Start a new tender document",
    icon: Plus,
  },
];

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

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedSampleData();
      setSeedDone(true);
      await loadProjects();
    } catch (err: any) {
      console.error("Seed failed:", err);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Manage your tender documents — generate TOCs and dividers with ease.
          </p>
        </div>

        {!loading && projects.length === 0 && !seedDone && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {seeding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[1.5]" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 stroke-[1.5]" />
            )}
            {seeding ? "Loading..." : "Load Sample Data"}
          </button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="mb-3 text-xs font-medium text-zinc-400">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-150 hover:bg-zinc-50"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500">
                  <Icon className="h-5 w-5 stroke-[1.5]" />
                </div>
                <h3 className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                  {action.label}
                </h3>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Seed Success */}
      {seedDone && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 stroke-[1.5]" />
          Sample data loaded! 3 projects created with 22 sections across Envelope 1, 2 & 3.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
        </div>
      )}

      {/* Recent Projects */}
      {!loading && projects.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium text-zinc-400">
              Recent Projects
            </h2>
            <Link
              href="/projects"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400">
                    Project Name
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-zinc-400">
                    Client
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-zinc-400">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {projects.map((project) => (
                  <tr
                    key={project.id}
                    onClick={() => window.location.href = `/projects/${project.id}`}
                    className="cursor-pointer transition-colors hover:bg-zinc-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400">
                          <FileText className="h-4 w-4 stroke-[1.5]" />
                        </div>
                        <span className="text-sm font-medium text-zinc-800 leading-snug pt-0.5">
                          {project.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-500">
                      {project.clientName || "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm text-zinc-400">
                        <Clock className="h-3.5 w-3.5 stroke-[1.5]" />
                        {formatTimeAgo(project.updatedAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && !seedDone && (
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
            <Upload className="h-6 w-6 stroke-[1.5]" />
          </div>
          <h3 className="text-sm font-medium text-zinc-800">
            Ready to get started?
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Import your Excel data to begin creating Table of Contents and Dividers.
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/import"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
            >
              <Upload className="h-4 w-4 stroke-[1.5]" />
              Import Data
            </Link>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 stroke-[1.5]" />
              Load Sample Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

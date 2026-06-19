"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Home,
  FolderKanban,
  Archive,
  Star,
  ChevronDown,
} from "lucide-react";
import { getProjects, getEnvelopes, type Project, type Envelope } from "@/lib/firestoreService";

interface ChildNode {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [projects, setProjects] = useState<Project[]>([]);
  const [envelopesMap, setEnvelopesMap] = useState<Record<string, Envelope[]>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Projects: true,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const projs = await getProjects();
      setProjects(projs);

      // Fetch envelopes for each project
      const envMap: Record<string, Envelope[]> = {};
      await Promise.all(
        projs.map(async (p) => {
          if (p.hasEnvelopes && p.id) {
            const envs = await getEnvelopes(p.id);
            envMap[p.id!] = envs;
          }
        })
      );
      setEnvelopesMap(envMap);
    } catch (err) {
      console.error("Failed to load sidebar data:", err);
    }
  }

  // Build dynamic children for Projects section
  const projectChildren: ChildNode[] = projects.map((p) => {
    const envs = envelopesMap[p.id!];
    if (envs && envs.length > 0) {
      return {
        href: `/projects/${p.id}`,
        label: p.name,
        children: envs.map((e) => ({
          href: `/envelopes/${e.id}`,
          label: e.title,
        })),
      };
    }
    return { href: `/projects/${p.id}`, label: p.name };
  });

  const toggleExpanded = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="flex w-[248px] flex-col py-8 pl-5 pr-3 select-none">
      {/* Menu Header */}
      <div className="flex items-center gap-2 px-4 pb-7">
        <Star className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[11px] font-medium text-zinc-400 tracking-wide">
          Menu
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5">
        {/* Home */}
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
            pathname === "/" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Home className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          <span>Home</span>
        </Link>

        {/* Projects (expandable) */}
        <div>
          <button
            onClick={() => toggleExpanded("Projects")}
            className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
              expanded.Projects
                ? "text-zinc-900"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <FolderKanban className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
            <span className="flex-1 text-left">Projects</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                expanded.Projects ? "text-zinc-400" : "text-zinc-400 -rotate-90"
              }`}
            />
          </button>

          {/* Dynamic project list */}
          {expanded.Projects && (
            <div className="space-y-0.5">
                {projectChildren.length === 0 && (
                  <Link
                    href="/projects/new"
                    className="flex items-center rounded-full pl-[46px] pr-4 py-2 text-sm text-zinc-400 hover:text-zinc-800 transition-colors"
                  >
                    <span className="italic">No projects yet</span>
                  </Link>
                )}
                {projectChildren.map((child) => {
                  const hasGrandchildren = child.children && child.children.length > 0;
                  const isChildExpanded = expanded[child.label] ?? true;

                  if (!hasGrandchildren) {
                    return (
                      <Link
                        key={child.label}
                        href={child.href}
                        className={`flex items-center rounded-full pl-[46px] pr-4 py-2 text-sm font-medium transition-all duration-150 ${
                          pathname === child.href.split("?")[0]
                            ? "text-zinc-800"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <div key={child.label}>
                      <button
                        onClick={() => toggleExpanded(child.label)}
                        className={`flex w-full items-center gap-2 rounded-full pl-[46px] pr-4 py-2 text-sm font-medium transition-all duration-150 ${
                          isChildExpanded
                            ? "text-zinc-800"
                            : "text-zinc-500 hover:text-zinc-800"
                        }`}
                      >
                        <span className="flex-1 text-left truncate">{child.label}</span>
                        <ChevronDown
                          className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${
                            isChildExpanded ? "text-zinc-400" : "text-zinc-400 -rotate-90"
                          }`}
                        />
                      </button>

                      {isChildExpanded && child.children && (
                        <div className="space-y-0.5">
                          {child.children.map((grandchild) => (
                            <Link
                              key={grandchild.label}
                              href={grandchild.href}
                              className={`flex items-center rounded-full pl-[62px] pr-4 py-1.5 text-sm font-medium transition-all duration-150 ${
                                pathname === grandchild.href.split("?")[0]
                                  ? "text-zinc-800"
                                  : "text-zinc-500 hover:text-zinc-800"
                              }`}
                            >
                              <span className="truncate">{grandchild.label}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          )}
        </div>

        {/* Archive */}
        <Link
          href="/archive"
          className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
            pathname === "/archive" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Archive className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          <span>Archive</span>
        </Link>
      </nav>
    </aside>
  );
}

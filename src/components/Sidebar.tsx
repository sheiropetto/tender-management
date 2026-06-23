"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Home,
  FolderKanban,
  Archive,
  Settings,
  Star,
  ChevronDown,
} from "lucide-react";
import { getProjects, getEnvelopes, type Project, type Envelope } from "@/lib/firestoreService";

interface ChildNode {
  href: string;
  label: string;
  shortName?: string;
  children?: { href: string; label: string; shortName?: string }[];
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

  // Group projects by year
  const getProjectYear = (p: Project): string => {
    if (p.submissionDate && p.submissionDate.length >= 4) {
      const year = p.submissionDate.slice(0, 4);
      if (/^\d{4}$/.test(year)) return year;
    }
    return "No date";
  };

  const yearGroups: Record<string, ChildNode[]> = {};
  projects.forEach((p) => {
    const year = getProjectYear(p);
    if (!yearGroups[year]) yearGroups[year] = [];
    const envs = envelopesMap[p.id!];
    const node: ChildNode = {
      href: `/projects/${p.id}`,
      label: p.name,
      shortName: p.shortName || p.name,
    };
    if (envs && envs.length > 0) {
      node.children = envs.map((e) => ({
        href: `/envelopes/${e.id}`,
        label: e.title,
      }));
    }
    yearGroups[year].push(node);
  });

  const sortedYears = Object.keys(yearGroups).sort((a, b) => {
    if (a === "No date") return 1;
    if (b === "No date") return -1;
    return parseInt(b) - parseInt(a);
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
          <div className="flex items-center">
            <Link
              href="/projects"
              className={`flex flex-1 items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
                pathname === "/projects" || pathname.startsWith("/projects/")
                  ? "text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <FolderKanban className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
              <span className="flex-1 text-left">Projects</span>
            </Link>
            <button
              onClick={() => toggleExpanded("Projects")}
              className="flex items-center justify-center h-9 w-9 mr-2 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  expanded.Projects ? "" : "-rotate-90"
                }`}
              />
            </button>
          </div>

          {/* Dynamic project list grouped by year */}
          {expanded.Projects && (
            <div className="space-y-1">
              {projects.length === 0 && (
                <Link
                  href="/projects/new"
                  className="flex items-center rounded-full pl-[46px] pr-4 py-2 text-sm text-zinc-400 hover:text-zinc-800 transition-colors"
                >
                  <span className="italic">No projects yet</span>
                </Link>
              )}
              {sortedYears.map((year) => {
                const isYearOpen = expanded[`year_${year}`] ?? true;
                const yearChildren = yearGroups[year];
                return (
                  <div key={year}>
                    <button
                      onClick={() => toggleExpanded(`year_${year}`)}
                      className="flex w-full items-center gap-2 rounded-full pl-[46px] pr-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isYearOpen ? "" : "-rotate-90"
                        }`}
                      />
                      <span>{year}</span>
                      <span className="text-zinc-300">({yearChildren.length})</span>
                    </button>

                    {isYearOpen && (
                      <div className="space-y-0.5">
                        {yearChildren.map((child) => {
                          const hasEnv = child.children && child.children.length > 0;
                          const isProjOpen = expanded[child.label] ?? true;

                          if (!hasEnv) {
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                className={`flex items-center rounded-full pl-[58px] pr-4 py-2 text-sm font-medium transition-all duration-150 ${
                                  pathname === child.href.split("?")[0]
                                    ? "text-zinc-800"
                                    : "text-zinc-500 hover:text-zinc-800"
                                }`}
                              >
                                <span>{child.shortName || child.label}</span>
                              </Link>
                            );
                          }

                          return (
                            <div key={child.label}>
                              <button
                                onClick={() => toggleExpanded(child.label)}
                                className={`flex w-full items-center gap-2 rounded-full pl-[58px] pr-4 py-2 text-sm font-medium transition-all duration-150 ${
                                  isProjOpen
                                    ? "text-zinc-800"
                                    : "text-zinc-500 hover:text-zinc-800"
                                }`}
                              >
                                <span className="flex-1 text-left">{child.shortName || child.label}</span>
                                <ChevronDown
                                  className={`h-3 w-3 flex-shrink-0 transition-transform duration-200 ${
                                    isProjOpen ? "text-zinc-400" : "text-zinc-400 -rotate-90"
                                  }`}
                                />
                              </button>

                              {isProjOpen && child.children && (
                                <div className="space-y-0.5">
                                  {child.children.map((grandchild) => (
                                    <Link
                                      key={grandchild.label}
                                      href={grandchild.href}
                                      className={`flex items-center rounded-full pl-[70px] pr-4 py-1.5 text-xs transition-all duration-150 ${
                                        pathname === grandchild.href.split("?")[0]
                                          ? "text-zinc-800"
                                          : "text-zinc-500 hover:text-zinc-800"
                                      }`}
                                    >
                                      <span className="leading-snug">{grandchild.label}</span>
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

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
            pathname === "/settings" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Settings className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}

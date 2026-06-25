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
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Projects: true,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const projs = await getProjects();
      const activeProjs = projs.filter(p => !p.archived);
      setProjects(activeProjs);

      // Fetch envelopes for each active project
      const envMap: Record<string, Envelope[]> = {};
      await Promise.all(
        activeProjs.map(async (p) => {
          if (p.hasEnvelopes && p.id) {
            const envs = await getEnvelopes(p.id);
            envMap[p.id!] = envs;
          }
        })
      );
      setEnvelopesMap(envMap);
    } catch (err) {
      console.error("Failed to load sidebar data:", err);
    } finally {
      setLoading(false);
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
    <aside className="flex w-[248px] flex-col py-8 pl-5 pr-3 select-none overflow-y-auto">
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
            pathname === "/" 
              ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-700/50" 
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
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
                  ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-700/50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              <FolderKanban className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
              <span className="flex-1 text-left">Projects</span>
            </Link>
            <button
              onClick={() => toggleExpanded("Projects")}
              className="flex items-center justify-center h-9 w-9 mr-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all cursor-pointer"
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
              {loading ? (
                <div className="flex items-center pl-[46px] py-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 animate-pulse">Loading...</span>
                </div>
              ) : projects.length === 0 ? (
                <Link
                  href="/projects/new"
                  className="flex items-center rounded-full pl-[46px] pr-4 py-2 text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                >
                  <span className="italic">No projects yet</span>
                </Link>
              ) : null}
              {sortedYears.map((year) => {
                const isYearOpen = expanded[`year_${year}`] ?? true;
                const yearChildren = yearGroups[year];
                return (
                  <div key={year}>
                    <button
                      onClick={() => toggleExpanded(`year_${year}`)}
                      className="flex w-full items-center gap-2 rounded-full pl-[46px] pr-4 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                    >
                      <ChevronDown
                        className={`h-3 w-3 transition-transform duration-200 ${
                          isYearOpen ? "" : "-rotate-90"
                        }`}
                      />
                      <span>{year}</span>
                      <span className="text-zinc-300 dark:text-zinc-600">({yearChildren.length})</span>
                    </button>

                    {isYearOpen && (
                      <div className="space-y-0.5 border-l border-zinc-200/60 dark:border-zinc-800/60 ml-12 pl-1.5 my-1">
                        {yearChildren.map((child) => {
                          const hasEnv = child.children && child.children.length > 0;
                          const isProjOpen = expanded[child.label] ?? false;

                          if (!hasEnv) {
                            return (
                              <Link
                                key={child.label}
                                href={child.href}
                                title={child.label}
                                className={`flex items-start rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                                  pathname === child.href.split("?")[0]
                                    ? "text-zinc-800 dark:text-zinc-100 font-semibold bg-zinc-200/30 dark:bg-zinc-700/20"
                                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                }`}
                              >
                                <span className="break-words text-left">{child.shortName || child.label}</span>
                              </Link>
                            );
                          }

                          return (
                            <div key={child.label} className="space-y-0.5">
                              <button
                                onClick={() => toggleExpanded(child.label)}
                                title={child.label}
                                className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                                  isProjOpen
                                    ? "text-zinc-800 dark:text-zinc-100 font-semibold"
                                    : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                                }`}
                              >
                                <span className="flex-1 text-left break-words">{child.shortName || child.label}</span>
                                <ChevronDown
                                  className={`h-3.5 w-3.5 flex-shrink-0 text-zinc-400 dark:text-zinc-500 transition-transform duration-200 mt-0.5 ${
                                    isProjOpen ? "" : "-rotate-90"
                                  }`}
                                />
                              </button>

                              {isProjOpen && child.children && (
                                <div className="space-y-0.5 border-l border-zinc-200/60 dark:border-zinc-800/60 ml-4 pl-1.5 my-0.5">
                                  {child.children.map((grandchild) => (
                                    <Link
                                      key={grandchild.label}
                                      href={grandchild.href}
                                      title={grandchild.label}
                                      className={`flex items-start rounded-xl px-3 py-1.5 text-xs transition-all duration-150 ${
                                        pathname === grandchild.href.split("?")[0]
                                          ? "text-zinc-800 dark:text-zinc-100 font-semibold bg-zinc-200/30 dark:bg-zinc-700/20"
                                          : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                      }`}
                                    >
                                      <span className="leading-snug break-words text-left">{grandchild.label}</span>
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
            pathname === "/archive" 
              ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-700/50" 
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Archive className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          <span>Archive</span>
        </Link>

        {/* Settings */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium transition-all duration-150 ${
            pathname === "/settings" 
              ? "text-zinc-900 dark:text-zinc-100 bg-zinc-200/50 dark:bg-zinc-700/50" 
              : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
        >
          <Settings className="h-[18px] w-[18px] flex-shrink-0 stroke-[1.5]" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Dark mode toggle */}
      <div className="px-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => {
            const isDark = document.documentElement.classList.toggle('dark');
            try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch(e) {}
          }}
          className="flex items-center gap-3 rounded-full px-4 py-3 w-full text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
        >
          <span className="dark:hidden">
            <svg className="h-[18px] w-[18px] stroke-[1.5] fill-none stroke-current" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </span>
          <span className="hidden dark:inline">
            <svg className="h-[18px] w-[18px] stroke-[1.5] fill-none stroke-current" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          </span>
          <span className="dark:hidden">Dark Mode</span>
          <span className="hidden dark:inline">Light Mode</span>
        </button>
      </div>
    </aside>
  );
}

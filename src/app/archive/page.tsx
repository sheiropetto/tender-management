"use client";

import { Archive, FileText } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Archive</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All your archived projects.
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <Archive className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">No archived projects</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Completed projects will appear here.
        </p>
      </div>
    </div>
  );
}

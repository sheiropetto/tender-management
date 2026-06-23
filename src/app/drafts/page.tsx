"use client";

import { FileText } from "lucide-react";

export default function DraftsPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Drafts</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Projects that are still in draft.
        </p>
      </div>
      <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
          <FileText className="h-6 w-6 text-zinc-400" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-900">No drafts</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Your draft projects will appear here.
        </p>
      </div>
    </div>
  );
}

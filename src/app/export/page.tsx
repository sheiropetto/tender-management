"use client";

import { FileDown, LayoutTemplate, Eye } from "lucide-react";
import Link from "next/link";

export default function ExportPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate and download your Table of Contents and Document Dividers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generate TOC */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
            <FileDown className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Table of Contents
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate a numbered TOC with color-coded entries matching your dividers.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
              <Eye className="h-4 w-4" />
              Preview TOC
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <FileDown className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>

        {/* Generate Dividers */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
            <LayoutTemplate className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Document Dividers
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Generate full A4 divider pages with bold borders for each section.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
              <Eye className="h-4 w-4" />
              Preview Dividers
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
              <FileDown className="h-4 w-4" />
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder preview area */}
      <div className="mt-8 rounded-xl border-2 border-dashed border-gray-200 bg-white/50 p-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Eye className="h-7 w-7 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          No content to preview yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Import data first, then come here to generate and preview your TOC and dividers.
        </p>
        <Link
          href="/import"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Import Data First
        </Link>
      </div>
    </div>
  );
}

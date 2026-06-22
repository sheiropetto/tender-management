"use client";

import { LayoutTemplate, Plus } from "lucide-react";

const templates = [
  {
    name: "Standard Tender",
    description: "Basic template with Envelope 1, 2, 3 structure",
    sections: 3,
    uses: 12,
  },
  {
    name: "Technical Proposal",
    description: "Detailed technical proposal with appendices",
    sections: 8,
    uses: 7,
  },
  {
    name: "Commercial Proposal",
    description: "Commercial and financial breakdown",
    sections: 5,
    uses: 9,
  },
];

export default function TemplatesPage() {
  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Save time with reusable document templates.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <div
            key={template.name}
            className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-900">{template.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {template.description}
            </p>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-400">
              <span>{template.sections} sections</span>
              <span>{template.uses} uses</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

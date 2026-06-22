"use client";

import { Plus, MoreHorizontal, ChevronDown } from "lucide-react";
import Link from "next/link";

interface PanelItem {
  label: string;
  href?: string;
  count?: number;
  isSelected?: boolean;
  isSubheader?: boolean;
  children?: PanelItem[];
}

export default function RightPanel() {
  const sections: {
    title: string;
    count?: number;
    items: PanelItem[];
  }[] = [
    {
      title: "Archive",
      items: [{ label: "All Projects", href: "/archive", count: 12 }],
    },
    {
      title: "Favourite's",
      items: [{ label: "Starred Projects", href: "/favourites", count: 4 }],
    },
    {
      title: "Drafts",
      count: 3,
      items: [
        { label: "General", isSubheader: true, children: [
          { label: "Drafts", count: 3 },
          { label: "Feedback" },
        ]},
      ],
    },
    {
      title: "Folders",
      count: 6,
      items: [
        { label: "Envelope 1", isSubheader: true, children: [
          { label: "Stroke LLC" },
          { label: "Duotone", isSelected: true },
          { label: "Solid" },
          { label: "Animations" },
        ]},
        { label: "Envelope 2", isSubheader: true, children: [
          { label: "Technical Proposal" },
          { label: "Commercial Proposal" },
        ]},
        { label: "Envelope 3", isSubheader: true, children: [
          { label: "Financial Capacity" },
        ]},
      ],
    },
  ];

  return (
    <div className="w-[248px] py-8 pr-5 pl-3 overflow-y-auto">
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            {/* Section Header */}
            <div className="flex items-center justify-between group mb-3 px-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-zinc-400">
                  {section.title}
                </span>
                {section.count !== undefined && (
                  <span className="flex items-center justify-center rounded-[3px] bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-500 h-[17px]">
                    {section.count}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <span className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-zinc-300 hover:bg-zinc-200/60 hover:text-zinc-500 transition-colors">
                  <Plus className="h-3 w-3 stroke-[1.5]" />
                </span>
                <span className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-zinc-300 hover:bg-zinc-200/60 hover:text-zinc-500 transition-colors">
                  <MoreHorizontal className="h-3 w-3 stroke-[1.5]" />
                </span>
                <ChevronDown className="h-3 w-3 text-zinc-300 stroke-[1.5]" />
              </div>
            </div>

            <div className="space-y-0.5">
              {section.items.map((item) => (
                <PanelItemRow key={item.label} item={item} depth={0} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelItemRow({ item, depth }: { item: PanelItem; depth: number }) {
  if (item.isSubheader) {
    return (
      <div>
        <div
          className="px-4 py-1 text-[11px] font-medium text-zinc-400"
          style={{ paddingLeft: `${16 + depth * 14}px` }}
        >
          {item.label}
        </div>
        {item.children?.map((child) => (
          <PanelItemRow key={child.label} item={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  const content = (
    <div
      className={`flex items-center justify-between rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150 cursor-pointer ${
        item.isSelected
          ? "bg-zinc-100 text-zinc-800"
          : "text-zinc-500 hover:bg-white hover:text-zinc-800"
      }`}
      style={{ paddingLeft: `${16 + depth * 14}px` }}
    >
      <span>{item.label}</span>
      {item.count !== undefined && (
        <span
          className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-[3px] px-1.5 text-[10px] font-medium ${
            item.isSelected
              ? "bg-white/15 text-white"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {item.count}
        </span>
      )}
    </div>
  );

  if (item.href) {
    return <Link href={item.href}>{content}</Link>;
  }
  return content;
}

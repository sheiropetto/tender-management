"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileDown, FileText, BookOpen, MapPin, Shield, LayoutTemplate } from "lucide-react";
import { getProject, getEnvelopes, type Project, type Envelope } from "@/lib/firestoreService";

const printOptions = [
  {
    id: "envelope-dividers",
    label: "Envelope Dividers",
    description: "One per envelope — A4 landscape with ORIGINAL/COPY labels",
    icon: BookOpen,
    href: "print/envelope-dividers",
    size: "A4 Landscape",
  },
  {
    id: "title-dividers",
    label: "Title Dividers",
    description: "One per row — currently available in each envelope",
    icon: FileText,
    href: "print/title-dividers",
    size: "A4 Portrait",
  },
  {
    id: "bid-security",
    label: "Bid Security & USB",
    description: "Bid Security and USB Pen Drive cover pages — half A4 landscape",
    icon: Shield,
    href: "print/bid-security",
    size: "Half A4 Landscape",
  },
  {
    id: "address-labels",
    label: "Submission Address Labels",
    description: "Address label pages with ORIGINAL/COPY — A4 landscape",
    icon: MapPin,
    href: "print/address-labels",
    size: "A4 Landscape",
  },
];

export default function PrintCenterPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    getProject(id)
      .then((proj) => {
        if (!proj) {
          router.push("/projects");
          return;
        }
        setProject(proj);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          Back to Project
        </Link>
        <h1 className="text-xl font-medium text-zinc-900">Print Documents</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          {project.shortName || project.name}
        </p>
      </div>

      {/* Print Options */}
      <div className="grid gap-4">
        {printOptions.map((option) => {
          const Icon = option.icon;
          return (
            <Link
              key={option.id}
              href={`/projects/${project.id}/${option.href}`}
              className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-all duration-150 hover:bg-zinc-50 hover:border-zinc-300"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 group-hover:border-zinc-300">
                <Icon className="h-5 w-5 stroke-[1.5]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-zinc-800 group-hover:text-zinc-900">
                    {option.label}
                  </h3>
                  <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    {option.size}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-400">
                  {option.description}
                </p>
              </div>
              <FileDown className="h-5 w-5 text-zinc-300 group-hover:text-zinc-500 stroke-[1.5] self-center" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

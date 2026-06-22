"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getProject, type Project } from "@/lib/firestoreService";

export default function BidSecurityPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;
    getProject(id).then((proj) => {
      if (!proj) { router.push("/projects"); return; }
      setProject(proj);
    }).catch(console.error).finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return <div className="flex items-center justify-center h-full py-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" /></div>;
  if (!project) return null;

  return (
    <div className="p-8 max-w-3xl">
      <Link href={`/projects/${project.id}/print`} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4">
        <ArrowLeft className="h-4 w-4 stroke-[1.5]" /> Back to Print Center
      </Link>
      <h1 className="text-xl font-medium text-zinc-900 mb-1">Bid Security & USB Pen Drive</h1>
      <p className="text-sm text-zinc-400 mb-6">{project.shortName || project.name}</p>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-medium text-zinc-800 mb-3">Bid Security</h3>
        <div className="flex gap-3">
          <Link
            href={`/projects/${project.id}/print/bid-security/preview?type=original`}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-center"
          >
            Print ORIGINAL
          </Link>
          <Link
            href={`/projects/${project.id}/print/bid-security/preview?type=copy`}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-center"
          >
            Print COPY
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="text-sm font-medium text-zinc-800 mb-3">USB Pen Drive</h3>
        <div className="flex gap-3">
          <Link
            href={`/projects/${project.id}/print/bid-security/preview?type=original&usb=true`}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-center"
          >
            Print ORIGINAL
          </Link>
          <Link
            href={`/projects/${project.id}/print/bid-security/preview?type=copy&usb=true`}
            className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors text-center"
          >
            Print COPY
          </Link>
        </div>
      </div>
    </div>
  );
}

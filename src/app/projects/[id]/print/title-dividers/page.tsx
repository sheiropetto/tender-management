"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react";
import { getProject, getEnvelopes, type Project, type Envelope } from "@/lib/firestoreService";

export default function TitleDividersPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    Promise.all([getProject(id), getEnvelopes(id)])
      .then(([proj, envs]) => {
        if (!proj) { router.push("/projects"); return; }
        setProject(proj);
        setEnvelopes(envs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  if (loading) {
    return <div className="flex items-center justify-center h-full py-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" /></div>;
  }

  if (!project) return null;

  return (
    <div className="p-8 max-w-3xl">
      <Link href={`/projects/${project.id}/print`} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4">
        <ArrowLeft className="h-4 w-4 stroke-[1.5]" /> Back to Print Center
      </Link>
      <h1 className="text-xl font-medium text-zinc-900 mb-1">Title Dividers</h1>
      <p className="text-sm text-zinc-400 mb-6">{project.shortName || project.name}</p>

      {envelopes.length === 0 ? (
        <p className="text-sm text-zinc-500">No envelopes found for this project.</p>
      ) : (
        <div className="space-y-3">
          {envelopes.map((env) => (
            <Link
              key={env.id}
              href={`/envelopes/${env.id}/dividers`}
              className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:bg-zinc-50"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-zinc-800">{env.title}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{env.rows?.length || 0} rows</p>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-300 stroke-[1.5]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileText } from "lucide-react";
import { getProject, getEnvelopes, type Project, type Envelope } from "@/lib/firestoreService";

export default function ProjectDetailPage() {
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
        if (!proj) {
          router.push("/projects");
          return;
        }
        setProject(proj);
        setEnvelopes(envs);
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
    <div className="p-8 max-w-2xl">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
        Back to Projects
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-900">{project.name}</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            {project.refNumber && `${project.refNumber} · `}
            {project.clientName}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
          project.status === "awarded" ? "bg-zinc-900 text-white" :
          project.status === "submitted" ? "bg-zinc-200 text-zinc-700" :
          project.status === "lost" ? "bg-zinc-100 text-zinc-500" :
          "bg-zinc-50 text-zinc-400"
        }`}>
          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
        </span>
      </div>

      {/* Project Info */}
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <InfoRow label="Reference" value={project.refNumber} />
        <InfoRow label="Client Ref" value={project.clientRefNumber} />
        <InfoRow label="Client" value={project.clientName} />
        <InfoRow label="Category" value={project.category ? project.category.charAt(0).toUpperCase() + project.category.slice(1) : "—"} />
        <InfoRow label="Submission Date" value={project.submissionDate} />
        <InfoRow label="Submission Time" value={project.submissionTime} />
        <InfoRow label="Budget (RM)" value={project.budget} />
        <InfoRow label="Contact Name" value={project.contactPersonName} />
        <InfoRow label="Contact Phone" value={project.contactPersonPhone} />
        <InfoRow label="Contact Email" value={project.contactPersonEmail} />
        <div className="col-span-2">
          <p className="text-xs text-zinc-400 mb-0.5">Submission Address</p>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{project.submissionAddress || "—"}</p>
        </div>
        {project.description && (
          <div className="col-span-2">
            <p className="text-xs text-zinc-400 mb-0.5">Notes</p>
            <p className="text-sm text-zinc-700">{project.description}</p>
          </div>
        )}
      </div>

      {/* Envelopes Section */}
      <div className="mt-6">
        <h2 className="text-xs font-medium text-zinc-400 mb-3">
          {project.hasEnvelopes ? "Envelopes" : "Content"}
        </h2>
        {envelopes.length > 0 ? (
          <div className="space-y-3">
            {envelopes.map((env) => (
              <Link
                key={env.id}
                href={`/envelopes/${env.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400">
                    <FileText className="h-4 w-4 stroke-[1.5]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 leading-snug">{env.title}</p>
                    <p className="text-xs text-zinc-400 mt-1">{env.rows?.length || 0} rows</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">
              No envelopes. Divider titles will be added directly to this project.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm text-zinc-700">{value || "—"}</p>
    </div>
  );
}

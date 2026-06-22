"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, type Envelope, type Project } from "@/lib/firestoreService";
import { Loader2 } from "lucide-react";

export default function EnvelopeDividerPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const envId = searchParams.get("envelopeId") || "";
  const labelType = searchParams.get("type") || "original"; // original | copy

  const [project, setProject] = useState<Project | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const projectId = params.id as string;
    if (!projectId || !envId) return;

    Promise.all([
      getProject(projectId),
      getDoc(doc(db, "envelopes", envId)).then((snap) =>
        snap.exists() ? { id: snap.id, ...snap.data() } as Envelope : null
      ),
    ])
      .then(([proj, env]) => {
        if (!proj || !env) { router.push("/projects"); return; }
        setProject(proj);
        setEnvelope(env);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, envId, router]);

  // Hide sidebar on mount, restore on unmount
  useEffect(() => {
    const aside = document.querySelector("aside");
    const origDisplay = aside?.style.display || "";
    document.querySelectorAll("aside, [class*='sidebar'], [class*='Sidebar']")
      .forEach(el => { (el as HTMLElement).style.display = "none"; });
    document.body.style.background = "white";
    return () => {
      if (aside) aside.style.display = origDisplay;
      document.body.style.background = "";
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" /></div>;
  }
  if (!project || !envelope) return null;

  const labelText = labelType === "copy" ? "COPY" : "ORIGINAL";

  return (
    <>
      <style>{`
        @media print {
          aside, [class*="sidebar"], [class*="Sidebar"], nav { display: none !important; }
          body > div { all: unset !important; display: block !important; width: 100% !important; background: white !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          main { all: unset !important; display: block !important; width: 100% !important; }
          .env-divider-page { display: flex !important; }
          .no-print { display: none !important; }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Envelope Divider Page — A4 Landscape */}
      <div className="env-divider-page">
        <div className="env-divider-frame">
          {/* Label at top-right corner */}
          <p className="env-divider-label">{labelText}</p>

          <div className="env-divider-content">
            {/* Project Name at top */}
            <div className="env-divider-top">
              <p className="env-divider-project">{project.name}</p>
              {project.refNumber && (
                <p className="env-divider-ref">{project.refNumber}</p>
              )}
            </div>

            {/* Envelope Title centered */}
            <div className="env-divider-middle">
              <p className="env-divider-envelope">{envelope.title}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

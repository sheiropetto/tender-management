"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getProject, type Project } from "@/lib/firestoreService";
import { Loader2 } from "lucide-react";

export default function AddressLabelPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const labelType = searchParams.get("type") || "original";

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
  if (!project) return null;

  const labelText = labelType === "copy" ? "COPY" : "ORIGINAL";
  const addressLines = (project.submissionAddress || "").split("\n").filter(Boolean);

  return (
    <>
      {/* Hide sidebar and set page size for print */}
      <style>{`
        @media print {
          aside, [class*="sidebar"], [class*="Sidebar"], nav { display: none !important; }
          body > div { all: unset !important; display: block !important; width: 100% !important; background: white !important; height: auto !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; display: block !important; height: auto !important; }
          main { all: unset !important; display: block !important; width: 100% !important; height: auto !important; }
          .env-divider-page { display: flex !important; }
          .no-print { display: none !important; }
        }
        @page { size: A4 landscape; margin: 0; }
      `}</style>
      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-500 hover:bg-zinc-50 transition-colors"
        >
          Back
        </button>
      </div>

      <div className="env-divider-page">
        <div className="env-divider-frame">
          <p className="env-divider-label">{labelText}</p>

          <div className="env-divider-content">
            {/* Top: Project Name + Ref */}
            <div className="env-divider-top">
              <p className="env-divider-project">{project.name}</p>
              {project.refNumber && (
                <p className="env-divider-ref">{project.refNumber}</p>
              )}
            </div>

            {/* Center: Address */}
            <div className="address-middle">
              <div className="address-block">
                {addressLines.length > 0 ? (
                  addressLines.map((line, i) => (
                    <p key={i} className="address-line">{line}</p>
                  ))
                ) : (
                  <p className="address-line text-zinc-400 italic">No address available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

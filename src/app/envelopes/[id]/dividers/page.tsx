"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2 } from "lucide-react";

export default function DividersPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    getDoc(doc(db, "envelopes", id))
      .then(async (snap) => {
        if (!snap.exists()) {
          router.push("/projects");
          return;
        }
        const data = { id: snap.id, ...snap.data() } as Envelope;
        setEnvelope(data);
        setColumns(data.columns || []);
        setRows(data.rows || []);

        if (data.projectId) {
          const proj = await getProject(data.projectId);
          if (proj) setProject(proj);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!envelope) return null;

  const refCol = columns[0];
  const descCol = columns[1];

  return (
    <>
      <style>{`
        @media print {
          aside, [class*="sidebar"], [class*="Sidebar"], nav { display: none !important; }
          body > div { all: unset !important; display: block !important; width: 100% !important; background: white !important; }
          body { background: white !important; padding: 0 !important; margin: 0 !important; }
          main { all: unset !important; display: block !important; width: 100% !important; }
          .divider-page { display: flex !important; }
          .no-print { display: none !important; }
        }
        @page { size: A4 portrait; margin: 0; }
      `}</style>
      {/* Print controls */}
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

      {/* Dividers */}
      {rows.map((row, i) => (
        <div key={row.id} className="divider-page">
          {/* Frame */}
          <div className="divider-frame">
            <div className="divider-content">
              {/* Upper half: Project at top, Envelope centered */}
              <div className="divider-half-top">
                <div className="divider-section">
                  {project?.name && (
                    <>
                      <p className="divider-text divider-text-project">{project.name}</p>
                      {project.refNumber && (
                        <p className="divider-text divider-text-ref">{project.refNumber}</p>
                      )}
                    </>
                  )}
                </div>
                <div className="divider-section">
                  <p className="divider-text divider-text-envelope">{envelope.title}</p>
                </div>
              </div>

              {/* Lower half: Appendix → Item → Notes centered */}
              <div className="divider-half-bottom">
                {refCol && row.cells[refCol.id] && (
                  <p className="divider-text divider-text-value">{row.cells[refCol.id]}</p>
                )}
                {descCol && row.cells[descCol.id] && (
                  <p className="divider-text divider-text-value">{row.cells[descCol.id]}</p>
                )}
                {columns[2] && row.cells[columns[2].id] && (
                  <p className="divider-text divider-text-value">{row.cells[columns[2].id]}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

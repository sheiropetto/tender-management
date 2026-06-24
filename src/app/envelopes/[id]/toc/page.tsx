"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, getSettings, updateEnvelope, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2, Printer, ChevronLeft, List } from "lucide-react";

const TAG_COLORS = [
  { label: "None", value: "" },
  { label: "Red", value: "#ef4444" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#22c55e" },
  { label: "Yellow", value: "#eab308" },
  { label: "Purple", value: "#a855f7" },
  { label: "Orange", value: "#f97316" },
];

export default function TOCPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [borderPx, setBorderPx] = useState(3);
  const portalRef = useRef<HTMLDivElement | null>(null);

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
          const [proj, settings] = await Promise.all([
            getProject(data.projectId),
            getSettings(),
          ]);
          if (proj) setProject(proj);
          const m = (settings.borderThickness || "").match(/(\d+)/);
          setBorderPx(m ? parseInt(m[1], 10) : 3);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Portal container
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "__toc_portal";
    document.body.insertBefore(container, document.body.firstChild);
    portalRef.current = container;
    setMounted(true);

    const aside = document.querySelector("aside");
    const origDisplay = aside?.style.display || "";
    document.querySelectorAll("aside, [class*='sidebar'], [class*='Sidebar']")
      .forEach(el => { (el as HTMLElement).style.display = "none"; });
    document.body.style.background = "white";
    document.body.style.display = "block";
    document.body.style.height = "auto";
    document.body.style.padding = "0";
    document.body.style.margin = "0";

    const allDivs = document.querySelectorAll("body > div");
    allDivs.forEach(div => {
      if (div.id !== "__toc_portal") {
        (div as HTMLElement).style.display = "none";
      }
    });
    const mainEl = document.querySelector("main") as HTMLElement;
    if (mainEl) mainEl.style.display = "none";

    return () => {
      if (aside) aside.style.display = origDisplay;
      document.body.style.cssText = "";
      allDivs.forEach(div => { (div as HTMLElement).style.cssText = ""; });
      if (mainEl) mainEl.style.cssText = "";
      if (container.parentNode) container.parentNode.removeChild(container);
      portalRef.current = null;
      setMounted(false);
    };
  }, []);

  const handlePrint = useCallback(() => {
    setShowPrintPreview(true);
    setTimeout(() => { window.print(); }, 100);
  }, []);

  const handleAfterPrint = useCallback(() => {
    setShowPrintPreview(false);
  }, []);

  useEffect(() => {
    if (showPrintPreview) {
      window.addEventListener("afterprint", handleAfterPrint);
      return () => window.removeEventListener("afterprint", handleAfterPrint);
    }
  }, [showPrintPreview, handleAfterPrint]);

  const updateTagColor = (rowId: string, color: string) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, tagColor: color } : r));
    // Persist to Firestore
    if (envelope?.id) {
      const updated = rows.map(r => r.id === rowId ? { ...r, tagColor: color } : r);
      updateEnvelope(envelope.id, { rows: updated });
    }
  };

  const refCol = columns[0];
  const descCol = columns[1];

  // ─── Render function ──────────────────────────────────────────────
  function renderTOCPage() {
    return (
      <div className="toc-page">
        <div className="toc-frame" style={{ borderWidth: borderPx }}>
          <div className="toc-content">
            {/* Header */}
            <div className="toc-header">
              {project?.name && (
                <p className="toc-project">{project.name}</p>
              )}
              {project?.refNumber && (
                <p className="toc-ref">{project.refNumber}</p>
              )}
              <h1 className="toc-title">Table of Contents</h1>
              {envelope?.title && (
                <p className="toc-envelope">{envelope.title}</p>
              )}
            </div>

            {/* Table */}
            <table className="toc-table">
              <thead>
                <tr>
                  <th className="toc-th toc-th-no">No.</th>
                  <th className="toc-th toc-th-app">Appendix</th>
                  <th className="toc-th toc-th-title">Title</th>
                  <th className="toc-th toc-th-tag">Tag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="toc-tr">
                    <td className="toc-td toc-td-no">{i + 1}</td>
                    <td className="toc-td toc-td-app">{refCol ? row.cells[refCol.id] || "" : ""}</td>
                    <td className="toc-td toc-td-title">{descCol ? row.cells[descCol.id] || "" : ""}</td>
                    <td className="toc-td toc-td-tag">
                      {row.tagColor && (
                        <span className="toc-tag-dot" style={{ backgroundColor: row.tagColor }} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Print version ──────────────────────────────────────────────
  const printContent = showPrintPreview && (
    <div style={{ background: "white" }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body > div:not(#__toc_portal) { display: none !important; }
        }
      `}</style>
      {renderTOCPage()}
    </div>
  );

  // ─── Screen view ────────────────────────────────────────────────
  const screenContent = (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 text-sm text-zinc-400">
              <Link href="/projects" className="hover:text-zinc-700 transition-colors">Projects</Link>
              <span className="text-zinc-300">/</span>
              {project ? (
                <Link href={`/projects/${project.id}`} className="hover:text-zinc-700 transition-colors truncate max-w-[200px]">{project.name}</Link>
              ) : <span className="text-zinc-300">...</span>}
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-700 font-medium truncate max-w-[250px]">{envelope?.title}</span>
              <span className="text-zinc-300">/</span>
              <span className="text-zinc-500">Table of Contents</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2"
            >
              <Printer className="h-4 w-4 stroke-[1.5]" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Preview of the TOC page */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="shadow-sm">{renderTOCPage()}</div>
      </div>

      {/* Color tag editor */}
      {rows.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-8 border-t border-zinc-100">
          <h2 className="text-sm font-medium text-zinc-700 mb-3">Tagging Colors</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Appendix</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Title</th>
                  <th className="px-3 py-2 text-xs font-medium text-zinc-400">Tag</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-400">{i + 1}</td>
                    <td className="px-3 py-2 text-zinc-700">{refCol ? row.cells[refCol.id] || "" : ""}</td>
                    <td className="px-3 py-2 text-zinc-700">{descCol ? row.cells[descCol.id] || "" : ""}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        {TAG_COLORS.map((tc) => (
                          <button
                            key={tc.label}
                            onClick={() => updateTagColor(row.id, tc.value)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${row.tagColor === tc.value ? 'border-zinc-800 scale-110' : 'border-zinc-200 hover:border-zinc-400'}`}
                            style={tc.value ? { backgroundColor: tc.value } : { backgroundColor: 'transparent' }}
                            title={tc.label}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!envelope) return null;

  return (
    <>
      {!showPrintPreview && portalRef.current && createPortal(screenContent, portalRef.current)}
      {showPrintPreview && portalRef.current && createPortal(printContent!, portalRef.current)}
    </>
  );
}

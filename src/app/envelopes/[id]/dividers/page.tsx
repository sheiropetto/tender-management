"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2, Printer, Grid3X3, List, ChevronLeft } from "lucide-react";

export default function DividersPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
          const proj = await getProject(data.projectId);
          if (proj) setProject(proj);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // Create a portal container at the BEGINNING of body (before layout wrapper)
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "__print_portal";
    document.body.insertBefore(container, document.body.firstChild);
    portalRef.current = container;
    setMounted(true);

    // Hide sidebar + entire layout wrapper below our portal
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
      if (div.id !== "__print_portal") {
        (div as HTMLElement).style.display = "none";
      }
    });
    const mainEl = document.querySelector("main") as HTMLElement;
    if (mainEl) mainEl.style.display = "none";

    return () => {
      if (aside) aside.style.display = origDisplay;
      document.body.style.cssText = "";
      allDivs.forEach(div => {
        if (div.id !== "__print_portal") {
          (div as HTMLElement).style.cssText = "";
        }
      });
      if (mainEl) mainEl.style.cssText = "";
      if (container.parentNode) container.parentNode.removeChild(container);
      portalRef.current = null;
      setMounted(false);
    };
  }, []);

  const handlePrint = useCallback(() => {
    setShowPrintPreview(true);
    // Wait for React to render the print preview, then trigger print
    setTimeout(() => {
      window.print();
    }, 100);
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

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!envelope) return null;

  const refCol = columns[0];
  const descCol = columns[1];

  // ─── Shared divider page render function ─────────────────────────
  function renderDividerPage(row: SheetRow) {
    return (
      <div className="divider-page" style={viewMode === 'grid' ? { width: '210mm', height: '297mm', margin: 0, pageBreakBefore: 'auto' } : undefined}>
        <div className="divider-frame">
          <div className="divider-content">
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
    );
  }

  // ─── Full A4 pages for printing ─────────────────────────────────
  const printPages = showPrintPreview && (
    <div style={{ background: "white" }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body > div:not(#__print_portal) { display: none !important; }
        }
      `}</style>
      {rows.map((row) => (
        <div key={row.id}>{renderDividerPage(row)}</div>
      ))}
    </div>
  );

  // ─── Grid card wrapper: renders the actual divider page scaled down ───
  function GridCard({ row, index }: { row: SheetRow; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.3);

    useEffect(() => {
      const el = cardRef.current;
      if (!el) return;
      const obs = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        // 210mm ≈ 793px at 96dpi
        setScale(w / 793);
      });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    return (
      <div className="flex flex-col items-center gap-2">
        <div
          ref={cardRef}
          className="w-full overflow-hidden bg-white"
          style={{ aspectRatio: '210 / 297' }}
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: '793px',
              height: '1123px',
            }}
          >
            {renderDividerPage(row)}
          </div>
        </div>
        <p className="text-xs font-medium text-zinc-500 text-center w-full truncate px-2">
          {refCol && row.cells[refCol.id] ? row.cells[refCol.id] : `Divider ${index + 1}`}
          {descCol && row.cells[descCol.id] && <> &middot; {row.cells[descCol.id]}</>}
        </p>
      </div>
    );
  }

  // ─── Grid view (screen) ──────────────────────────────────────────
  const gridContent = (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="rounded-full border border-zinc-300 bg-transparent p-2 text-zinc-500 hover:bg-zinc-50 transition-colors"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5 stroke-[1.5]" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-zinc-800">{envelope.title}</h1>
              <p className="text-sm text-zinc-500">{rows.length} dividers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm transition-colors ${
                  viewMode === 'grid' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <Grid3X3 className="h-4 w-4 stroke-[1.5]" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm transition-colors ${
                  viewMode === 'list' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <List className="h-4 w-4 stroke-[1.5]" />
                <span>List</span>
              </button>
            </div>
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

      {/* Content */}
      {viewMode === 'grid' ? (
        /* ─── Grid of scaled actual divider pages ─── */
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rows.map((row, i) => (
              <GridCard key={row.id} row={row} index={i} />
            ))}
          </div>
        </div>
      ) : (
        /* ─── List view — vertical stack of full A4 pages ─── */
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-8">
          {rows.map((row) => (
            <div key={row.id} className="shadow-sm">
              {renderDividerPage(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {!showPrintPreview && createPortal(gridContent, portalRef.current!)}
      {showPrintPreview && portalRef.current && createPortal(printPages, portalRef.current)}
    </>
  );
}

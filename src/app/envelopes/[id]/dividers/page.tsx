"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, getSettings, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2, Printer, Grid3X3, List, ChevronLeft, Search, X, ZoomIn, ZoomOut } from "lucide-react";

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
  const [borderPx, setBorderPx] = useState(3);
  const [showProjDetails, setShowProjDetails] = useState(true);
  const [showRefNumber, setShowRefNumber] = useState(true);
  const [dividerAlign, setDividerAlign] = useState<'left' | 'center' | 'right'>('center');
  const [searchQuery, setSearchQuery] = useState("");
  const [excludedRows, setExcludedRows] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<number>(0.8);

  const toggleRowExclusion = useCallback((rowId: string) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

  const portalRef = useRef<HTMLDivElement | null>(null);

  const refCol = columns[0];
  const descCol = columns[1];

  // ─── Search Filtering ────────────────────────────────────────────
  const filteredRows = rows.filter((row) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const refVal = (refCol && row.cells[refCol.id] || "").toLowerCase();
    const descVal = (descCol && row.cells[descCol.id] || "").toLowerCase();
    return refVal.includes(query) || descVal.includes(query);
  });

  const handleSelectAll = useCallback(() => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      filteredRows.forEach(row => next.delete(row.id));
      return next;
    });
  }, [filteredRows]);

  const handleDeselectAll = useCallback(() => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      filteredRows.forEach(row => next.add(row.id));
      return next;
    });
  }, [filteredRows]);

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

  // ─── Shared divider page render function ─────────────────────────
  function renderDividerPage(row: SheetRow) {
    const justifyAlign = dividerAlign === 'left' ? 'flex-start' : dividerAlign === 'right' ? 'flex-end' : 'center';
    const textAlignment = dividerAlign;

    return (
      <div className="divider-page" style={viewMode === 'grid' ? { width: '210mm', height: '297mm', margin: 0, pageBreakBefore: 'auto' } : undefined}>
        <div className="divider-frame" style={{ borderWidth: borderPx }}>
          <div className="divider-content">
            <div className="divider-half-top" style={{ paddingRight: dividerAlign === 'center' ? '0mm' : '60mm', width: '100%' }}>
              {showProjDetails && project?.name && (
                <p className="divider-text divider-text-project" style={{ textAlign: textAlignment, marginLeft: dividerAlign === 'center' ? 'auto' : undefined, marginRight: dividerAlign === 'center' ? 'auto' : undefined }}>{project.name}</p>
              )}
              {showRefNumber && project?.refNumber && (
                <p className="divider-text divider-text-ref" style={{ textAlign: textAlignment, marginTop: '2mm', marginLeft: dividerAlign === 'center' ? 'auto' : undefined, marginRight: dividerAlign === 'center' ? 'auto' : undefined }}>{project.refNumber}</p>
              )}
            </div>
            <div className="divider-half-bottom" style={{ alignItems: justifyAlign }}>
              {refCol && row.cells[refCol.id] && (
                <p className="divider-text divider-text-value" style={{ textAlign: textAlignment }}>{row.cells[refCol.id]}</p>
              )}
              {descCol && row.cells[descCol.id] && (
                <p className="divider-text divider-text-value" style={{ textAlign: textAlignment }}>{row.cells[descCol.id]}</p>
              )}
              {columns.slice(2).map((col) => (
                <p key={col.id} className="divider-text divider-text-value" style={{ textAlign: textAlignment }}>
                  {col.printHidden ? '\u00A0' : (row.cells[col.id] || '')}
                </p>
              ))}
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
          .divider-page-print-wrapper {
            page-break-before: avoid !important;
            page-break-after: always !important;
          }
          .divider-page-print-wrapper:last-of-type {
            page-break-after: avoid !important;
          }
          body .divider-page {
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }
        }
      `}</style>
      {rows
        .filter((row) => !excludedRows.has(row.id))
        .map((row) => (
          <div key={row.id} className="divider-page-print-wrapper">
            {renderDividerPage(row)}
          </div>
        ))}
    </div>
  );

  // ─── Grid card wrapper: renders the actual divider page scaled down ───
  function GridCard({ row, index }: { row: SheetRow; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.3);
    const isExcluded = excludedRows.has(row.id);

    useEffect(() => {
      const el = cardRef.current;
      if (!el) return;
      const obs = new ResizeObserver((entries) => {
        const w = entries[0].contentRect.width;
        setScale(w / 793);
      });
      obs.observe(el);
      return () => obs.disconnect();
    }, []);

    return (
      <div 
        className={`flex flex-col items-center gap-2 p-2 rounded-xl border transition-all relative group ${
          isExcluded ? 'opacity-40 border-dashed border-zinc-200 bg-zinc-50/50' : 'border-zinc-100 bg-white hover:border-zinc-300 hover:shadow-sm'
        }`}
        style={{ width: `${260 * zoom}px` }}
      >
        {/* Toggle Checkbox overlay */}
        <div className="absolute top-4 left-4 z-30">
          <input
            type="checkbox"
            checked={!isExcluded}
            onChange={() => toggleRowExclusion(row.id)}
            className="accent-zinc-700 w-4 h-4 cursor-pointer rounded border-zinc-300"
            title={isExcluded ? "Include in print" : "Exclude from print"}
          />
        </div>

        <div
          ref={cardRef}
          className="w-full overflow-hidden bg-white border border-zinc-200"
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
        <p className="text-xs font-semibold text-zinc-500 text-center w-full truncate px-2 select-none">
          {refCol && row.cells[refCol.id] ? row.cells[refCol.id] : `Divider ${index + 1}`}
          {descCol && row.cells[descCol.id] && <> &middot; {row.cells[descCol.id]}</>}
        </p>
      </div>
    );
  }

  // ─── Grid view (screen) ──────────────────────────────────────────
  const gridContent = (
    <div className="min-h-screen bg-zinc-50/30">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="rounded-full border border-zinc-300 bg-transparent p-2 text-zinc-500 hover:bg-zinc-50 transition-colors cursor-pointer shrink-0"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5 stroke-[1.5]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-zinc-800 tracking-tight truncate">{envelope?.title}</h1>
              <div className="flex items-center gap-2 mt-0.5 select-none">
                <p className="text-xs text-zinc-400 font-medium">
                  {rows.length - excludedRows.size} of {rows.length} dividers active
                </p>
                <span className="text-zinc-300 text-[10px]">&middot;</span>
                <button
                  onClick={handleSelectAll}
                  className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-zinc-300 text-[10px]">&middot;</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {/* View toggle */}
            <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden bg-white">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                <List className="h-3.5 w-3.5 stroke-[1.5]" />
                <span>List</span>
              </button>
            </div>
            
            <button
              onClick={handlePrint}
              disabled={rows.length === excludedRows.size}
              className="rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <Printer className="h-3.5 w-3.5 stroke-[1.5]" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Customization & Filter Panel */}
        <div className="border-t border-zinc-200 bg-zinc-50/60 py-3 px-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
            {/* Search */}
            <div className="flex items-center gap-2 relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 stroke-[1.5]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter dividers..."
                className="w-48 rounded-full border border-zinc-300 bg-white pl-8 pr-3 py-1.5 outline-none focus:border-zinc-400 text-xs text-zinc-700 font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-300 hover:text-zinc-500 text-xs">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* Border Thickness */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Border:</span>
                <select
                  value={borderPx}
                  onChange={(e) => setBorderPx(parseInt(e.target.value, 10))}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 outline-none cursor-pointer text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 8, 10].map(px => (
                    <option key={px} value={px}>{px}px</option>
                  ))}
                </select>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Zoom:</span>
                <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden bg-white">
                  <button
                    onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                    className="p-1.5 text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                  <span className="px-2 text-[10px] font-bold text-zinc-700 min-w-[36px] text-center select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
                    className="p-1.5 text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Align:</span>
                <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden bg-white">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setDividerAlign(align)}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                        dividerAlign === align ? 'bg-zinc-100 text-zinc-800 border-r border-l border-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {align === 'left' ? 'L' : align === 'center' ? 'C' : 'R'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-4 select-none">
                <label className="flex items-center gap-1.5 text-zinc-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProjDetails}
                    onChange={(e) => setShowProjDetails(e.target.checked)}
                    className="accent-zinc-700 w-3.5 h-3.5 rounded border-zinc-300"
                  />
                  <span>Project Name</span>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRefNumber}
                    onChange={(e) => setShowRefNumber(e.target.checked)}
                    className="accent-zinc-700 w-3.5 h-3.5 rounded border-zinc-300"
                  />
                  <span>Reference ID</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        /* ─── Grid of scaled actual divider pages ─── */
        <div className="max-w-7xl mx-auto px-6 py-8">
          {filteredRows.length === 0 ? (
            <div className="text-center py-20 text-sm text-zinc-400">
              No dividers match your search filter.
            </div>
          ) : (
            <div className="flex flex-wrap gap-6 justify-center">
              {filteredRows.map((row, i) => (
                <GridCard key={row.id} row={row} index={i} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── List view — vertical stack of full A4 pages ─── */
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col items-center gap-8">
          {filteredRows.length === 0 ? (
            <div className="text-center py-20 text-sm text-zinc-400">
              No dividers match your search filter.
            </div>
          ) : (
            filteredRows.map((row) => {
              const isExcluded = excludedRows.has(row.id);
              return (
                <div key={row.id} className="relative group shadow-sm bg-white border border-zinc-100 rounded-lg overflow-hidden" style={{ width: `${210 * zoom}mm`, height: `${297 * zoom}mm` }}>
                  {/* Print inclusion banner overlay */}
                  <div className="absolute top-4 left-4 z-30 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-zinc-200 shadow-sm">
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => toggleRowExclusion(row.id)}
                      className="accent-zinc-700 w-4 h-4 cursor-pointer rounded border-zinc-300"
                    />
                    <span className="text-xs text-zinc-500 font-semibold select-none">
                      {isExcluded ? 'Excluded from PDF' : 'Included in PDF'}
                    </span>
                  </div>
                  <div className={`transition-opacity duration-200 ${isExcluded ? 'opacity-30' : ''}`} style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '210mm', height: '297mm' }}>
                    {renderDividerPage(row)}
                  </div>
                </div>
              );
            })
          )}
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

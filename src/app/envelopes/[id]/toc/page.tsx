"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, getSettings, updateEnvelope, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2, Printer, ChevronLeft, List, Search, X, ZoomIn, ZoomOut } from "lucide-react";

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
  const [showProjDetails, setShowProjDetails] = useState(true);
  const [showRefNumber, setShowRefNumber] = useState(true);
  const [showEnvTitle, setShowEnvTitle] = useState(true);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showTagColumn, setShowTagColumn] = useState(true);
  const [density, setDensity] = useState<'compact' | 'medium' | 'cozy'>('medium');
  const [headerAlign, setHeaderAlign] = useState<'left' | 'center' | 'right'>('center');
  const [searchQuery, setSearchQuery] = useState("");
  const [excludedRows, setExcludedRows] = useState<Set<string>>(new Set());

  const [rowsPerPage, setRowsPerPage] = useState<number>(8);
  const [zoom, setZoom] = useState<number>(0.8);

  // Custom column titles
  const [colTitleNo, setColTitleNo] = useState("No.");
  const [colTitleApp, setColTitleApp] = useState("Appendix");
  const [colTitleTitle, setColTitleTitle] = useState("Title");
  const [colTitleTag, setColTitleTag] = useState("Tag");

  const toggleRowExclusion = useCallback((rowId: string) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }, []);

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

  const handleResetAllTags = () => {
    const updated = rows.map(r => ({ ...r, tagColor: "" }));
    setRows(updated);
    if (envelope?.id) {
      updateEnvelope(envelope.id, { rows: updated });
    }
  };

  const refCol = columns[0];
  const descCol = columns[1];

  const activeRows = rows.filter(row => {
    if (excludedRows.has(row.id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const refVal = (refCol && row.cells[refCol.id] || "").toLowerCase();
    const descVal = (descCol && row.cells[descCol.id] || "").toLowerCase();
    return refVal.includes(q) || descVal.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));

  // ─── Render function ──────────────────────────────────────────────
  function renderTOCPage(pageIndex: number, pageRows: SheetRow[], totalPagesCount: number) {
    const textAlignment = headerAlign;
    const projectMargin = headerAlign === 'center' 
      ? `0 auto ${showRefNumber && project?.refNumber ? '2mm' : '12mm'} auto` 
      : headerAlign === 'right' 
        ? `0 0 ${showRefNumber && project?.refNumber ? '2mm' : '12mm'} auto` 
        : `0 0 ${showRefNumber && project?.refNumber ? '2mm' : '12mm'} 0`;

    const refMargin = headerAlign === 'center' ? '0 auto 12mm auto' : headerAlign === 'right' ? '0 0 12mm auto' : '0 0 12mm 0';

    return (
      <div className="toc-page">
        <div className="toc-frame" style={{ borderWidth: borderPx }}>
          <div className="toc-content">
            {/* Header */}
            <div className="toc-header" style={{ textAlign: textAlignment }}>
              {showProjDetails && project?.name && (
                <p className="toc-project" style={{ margin: projectMargin, width: '100%' }}>{project.name}</p>
              )}
              {showRefNumber && project?.refNumber && (
                <p className="toc-ref" style={{ margin: refMargin, width: '100%' }}>{project.refNumber}</p>
              )}
              <h1 className="toc-title">
                Table of Contents{pageIndex > 0 ? " (Continued)" : ""}
              </h1>
              {showEnvTitle && envelope?.title && (
                <p className="toc-envelope">{envelope.title}</p>
              )}
            </div>

            {/* Table */}
            <table className="toc-table">
              {showHeaders && (
                <thead>
                  <tr className={`toc-tr-${density}`}>
                    <th className="toc-th toc-th-no">{colTitleNo}</th>
                    <th className="toc-th toc-th-app">{colTitleApp}</th>
                    <th className="toc-th toc-th-title">{colTitleTitle}</th>
                    {showTagColumn && <th className="toc-th toc-th-tag">{colTitleTag}</th>}
                  </tr>
                </thead>
              )}
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={row.id} className={`toc-tr toc-tr-${density}`}>
                    <td className="toc-td toc-td-no">{(pageIndex * rowsPerPage) + i + 1}</td>
                    <td className="toc-td toc-td-app">{refCol ? row.cells[refCol.id] || "" : ""}</td>
                    <td className="toc-td toc-td-title">{descCol ? row.cells[descCol.id] || "" : ""}</td>
                    {showTagColumn && (
                      <td className="toc-td toc-td-tag">
                        {row.tagColor && (
                          <span className="toc-tag-dot" style={{ backgroundColor: row.tagColor }} />
                        )}
                      </td>
                    )}
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
      {Array.from({ length: totalPages }).map((_, pageIndex) => {
        const start = pageIndex * rowsPerPage;
        const pageRows = activeRows.slice(start, start + rowsPerPage);
        return (
          <div key={pageIndex}>
            {renderTOCPage(pageIndex, pageRows, totalPages)}
          </div>
        );
      })}
    </div>
  );

  // ─── Screen view ────────────────────────────────────────────────
  const screenContent = (
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
              <p className="text-xs text-zinc-400 font-medium">Table of Contents Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                placeholder="Filter items..."
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

              {/* Rows Per Page */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Rows/Page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                  className="rounded-full border border-zinc-300 bg-white px-3 py-1 outline-none cursor-pointer text-xs font-semibold text-zinc-700 hover:border-zinc-400"
                >
                  {[5, 8, 10, 12, 15, 18, 20, 22, 25, 30].map(n => (
                    <option key={n} value={n}>{n} rows</option>
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

              {/* Spacing Density */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Density:</span>
                <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden bg-white">
                  {(['compact', 'medium', 'cozy'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d)}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                        density === d ? 'bg-zinc-100 text-zinc-800 border-r border-l border-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-medium select-none">Header Align:</span>
                <div className="flex items-center rounded-full border border-zinc-300 overflow-hidden bg-white">
                  {(['left', 'center', 'right'] as const).map((align) => (
                    <button
                      key={align}
                      onClick={() => setHeaderAlign(align)}
                      className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-colors cursor-pointer ${
                        headerAlign === align ? 'bg-zinc-100 text-zinc-800 border-r border-l border-zinc-200/50' : 'text-zinc-400 hover:text-zinc-600'
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
                <label className="flex items-center gap-1.5 text-zinc-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEnvTitle}
                    onChange={(e) => setShowEnvTitle(e.target.checked)}
                    className="accent-zinc-700 w-3.5 h-3.5 rounded border-zinc-300"
                  />
                  <span>Envelope Title</span>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHeaders}
                    onChange={(e) => setShowHeaders(e.target.checked)}
                    className="accent-zinc-700 w-3.5 h-3.5 rounded border-zinc-300"
                  />
                  <span>Headers</span>
                </label>
                <label className="flex items-center gap-1.5 text-zinc-500 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTagColumn}
                    onChange={(e) => setShowTagColumn(e.target.checked)}
                    className="accent-zinc-700 w-3.5 h-3.5 rounded border-zinc-300"
                  />
                  <span>Tags</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview of the TOC pages */}
      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8 items-center">
        {Array.from({ length: totalPages }).map((_, pageIndex) => {
          const start = pageIndex * rowsPerPage;
          const pageRows = activeRows.slice(start, start + rowsPerPage);
          return (
            <div key={pageIndex} className="shadow-sm bg-white rounded-lg border border-zinc-200 overflow-hidden relative" style={{ width: `${210 * zoom}mm`, height: `${297 * zoom}mm` }}>
              {totalPages > 1 && (
                <div className="absolute top-4 right-4 z-30 bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full text-xs font-semibold select-none">
                  Page {pageIndex + 1} of {totalPages}
                </div>
              )}
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: '210mm', height: '297mm' }}>
                {renderTOCPage(pageIndex, pageRows, totalPages)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item Management Table */}
      {rows.length > 0 && (
        <div className="max-w-4xl mx-auto px-6 py-8 border-t border-zinc-200 bg-white rounded-xl shadow-sm mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-zinc-800">Custom Column Titles</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Rename table headers dynamically</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-400">Col 1</span>
                <input
                  type="text"
                  value={colTitleNo}
                  onChange={(e) => setColTitleNo(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 outline-none focus:border-zinc-400 font-medium w-full text-zinc-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-400">Col 2</span>
                <input
                  type="text"
                  value={colTitleApp}
                  onChange={(e) => setColTitleApp(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 outline-none focus:border-zinc-400 font-medium w-full text-zinc-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-400">Col 3</span>
                <input
                  type="text"
                  value={colTitleTitle}
                  onChange={(e) => setColTitleTitle(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 outline-none focus:border-zinc-400 font-medium w-full text-zinc-700"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-400">Col 4</span>
                <input
                  type="text"
                  value={colTitleTag}
                  disabled={!showTagColumn}
                  onChange={(e) => setColTitleTag(e.target.value)}
                  className="rounded-lg border border-zinc-200 px-2 py-1 outline-none focus:border-zinc-400 font-medium w-full text-zinc-700 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <hr className="border-zinc-100 my-4" />

          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-sm font-bold text-zinc-800">TOC Item Exclusions & Tags</h2>
            <button
              onClick={handleResetAllTags}
              className="rounded-full border border-zinc-200 bg-transparent px-3 py-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Reset Tag Colors
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-400 w-12 text-center">Active</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-400 w-12 text-center">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-400">{colTitleApp}</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-zinc-400">{colTitleTitle}</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-zinc-400 text-center w-48">Tag Color</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const isExcluded = excludedRows.has(row.id);
                  return (
                    <tr key={row.id} className={`border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors ${isExcluded ? 'bg-zinc-50/30 opacity-60' : ''}`}>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={() => toggleRowExclusion(row.id)}
                          className="accent-zinc-700 w-4 h-4 cursor-pointer rounded border-zinc-300"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 text-center font-medium">{i + 1}</td>
                      <td className="px-3 py-2.5 text-zinc-700 font-semibold">{refCol ? row.cells[refCol.id] || "" : ""}</td>
                      <td className="px-3 py-2.5 text-zinc-600 font-medium">{descCol ? row.cells[descCol.id] || "" : ""}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          {TAG_COLORS.map((tc) => (
                            <button
                              key={tc.label}
                              disabled={isExcluded}
                              onClick={() => updateTagColor(row.id, tc.value)}
                              className={`w-4 h-4 rounded-full border transition-all ${
                                row.tagColor === tc.value 
                                  ? 'ring-2 ring-offset-1 ring-zinc-600 scale-110' 
                                  : 'border-zinc-200 hover:border-zinc-400'
                              } disabled:opacity-50`}
                              style={tc.value ? { backgroundColor: tc.value } : { borderStyle: 'dashed', backgroundColor: 'transparent' }}
                              title={tc.label}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

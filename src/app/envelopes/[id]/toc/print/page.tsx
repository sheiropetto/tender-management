"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getProject, type Envelope, type ColumnDef, type SheetRow, type Project } from "@/lib/firestoreService";
import { Loader2, Printer, ChevronLeft } from "lucide-react";

export default function TOCPrintPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [project, setProject] = useState<Project | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Settings from query params
  const borderPx = parseInt(searchParams.get("borderPx") || "3", 10);
  const rowsPerPage = parseInt(searchParams.get("rowsPerPage") || "8", 10);
  const density = (searchParams.get("density") || "medium") as 'compact' | 'medium' | 'cozy';
  const headerAlign = (searchParams.get("headerAlign") || "center") as 'left' | 'center' | 'right';
  
  const showProjDetails = searchParams.get("showProjDetails") !== "false";
  const showRefNumber = searchParams.get("showRefNumber") !== "false";
  const showEnvTitle = searchParams.get("showEnvTitle") !== "false";
  const showHeaders = searchParams.get("showHeaders") !== "false";
  const showTagColumn = searchParams.get("showTagColumn") !== "false";
  const excludedRows = new Set(searchParams.get("excludedRows")?.split(",") || []);
  const searchQuery = searchParams.get("searchQuery") || "";

  const colTitleNo = searchParams.get("colTitleNo") || "No.";
  const colTitleApp = searchParams.get("colTitleApp") || "Appendix";
  const colTitleTitle = searchParams.get("colTitleTitle") || "Title";
  const colTitleTag = searchParams.get("colTitleTag") || "Tag";

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

  // Set up print portal to override Next.js root layout wrapper
  useEffect(() => {
    const container = document.createElement("div");
    container.id = "__toc_print_portal";
    document.body.insertBefore(container, document.body.firstChild);
    portalRef.current = container;
    setMounted(true);

    // Hide sidebar and Next.js main elements
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
      if (div.id !== "__toc_print_portal") {
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

  // Automatically trigger print dialog when data is loaded
  useEffect(() => {
    if (!loading && mounted) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, mounted]);

  const refCol = columns[0];
  const descCol = columns[1];

  const activeRows = rows.filter(row => {
    if (excludedRows.has(row.id)) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const refVal = (refCol && row.cells[refCol.id] || "").toLowerCase();
    if (refVal.includes(q)) return true;
    for (const col of columns.slice(1)) {
      const val = (row.cells[col.id] || "").toLowerCase();
      if (val.includes(q)) return true;
    }
    return false;
  });

  const totalPages = Math.max(1, Math.ceil(activeRows.length / rowsPerPage));

  const handleBack = () => {
    if (window.opener) {
      window.close();
    } else {
      router.push(`/envelopes/${envelope?.id}/toc`);
    }
  };

  function renderTOCPage(pageIndex: number, pageRows: SheetRow[]) {
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
                {totalPages > 1 
                  ? `TABLE OF CONTENTS (${pageIndex + 1} OF ${totalPages})` 
                  : "TABLE OF CONTENTS"}
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
                    <td className="toc-td toc-td-title">
                      <div className="font-semibold">{descCol ? row.cells[descCol.id] || "" : ""}</div>
                      {columns.slice(2).map((col) => {
                        const cellVal = row.cells[col.id];
                        if (!cellVal) return null;
                        if (col.printHidden) {
                          return (
                            <div key={col.id} className="text-zinc-500 text-[10pt] mt-1 leading-normal font-normal invisible select-none">
                              {cellVal}
                            </div>
                          );
                        }
                        return (
                          <div key={col.id} className="text-zinc-500 text-[10pt] mt-1 leading-normal font-normal">
                            <span>{cellVal}</span>
                          </div>
                        );
                      })}
                    </td>
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

  if (loading || !mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!envelope) return null;

  const content = (
    <div style={{ background: "white" }}>
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          body > div:not(#__toc_print_portal) { display: none !important; }
          .toc-print-container {
            display: block !important;
            background: white !important;
          }
          
          /* The wrapper controls the page break */
          .toc-print-page {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-before: always !important;
            page-break-inside: avoid !important;
          }
          
          /* No break on the first wrapper */
          .toc-print-page:first-of-type {
            page-break-before: avoid !important;
          }
          
          /* Override the global .toc-page style to NEVER break here, 
             since the wrapper handles it. Use higher specificity. */
          body .toc-print-page .toc-page,
          body .toc-page {
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            break-inside: avoid !important;
            height: auto !important;
            min-height: 100%;
          }
        }
        .no-print-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f4f4f5;
          padding: 12px 24px;
          border-bottom: 1px solid #e4e4e7;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        @media print {
          .no-print-top-bar {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Interactive print control bar */}
      <div className="no-print-top-bar">
        <button
          onClick={handleBack}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </button>
        <div className="text-xs text-zinc-500 font-medium">
          Print Preview Mode
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Pages Container */}
      <div className="flex flex-col items-center bg-zinc-100 min-h-screen py-8 print:bg-white print:py-0 toc-print-container">
        {Array.from({ length: totalPages }).map((_, pageIndex) => {
          const start = pageIndex * rowsPerPage;
          const pageRows = activeRows.slice(start, start + rowsPerPage);
          return (
            <div key={pageIndex} className="print:shadow-none shadow-md bg-white mb-8 print:mb-0 toc-print-page">
              {renderTOCPage(pageIndex, pageRows)}
            </div>
          );
        })}
      </div>
    </div>
  );

  return portalRef.current ? createPortal(content, portalRef.current) : null;
}

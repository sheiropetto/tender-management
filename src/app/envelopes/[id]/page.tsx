"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileDown, Undo2, Download, Upload, X, List } from "lucide-react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateEnvelope, getProject, type Envelope, type ColumnDef, type SheetRow } from "@/lib/firestoreService";
import SpreadsheetTable from "@/components/SpreadsheetTable";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

export default function EnvelopeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [rows, setRows] = useState<SheetRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<{ cols: ColumnDef[]; rows: SheetRow[] }[]>([]);

  const pushSnapshot = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev, { cols: JSON.parse(JSON.stringify(columns)), rows: JSON.parse(JSON.stringify(rows)) }];
      if (next.length > 50) next.shift();
      return next;
    });
  }, [columns, rows]);

  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setColumns(last.cols);
      setRows(last.rows);
      setDirty(true);
      return prev.slice(0, -1);
    });
  }, []);

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
        setProjectId(data.projectId);
        if (data.projectId) {
          getProject(data.projectId).then((p) => { if (p) setProjectName(p.name); });
        }

        // Auto-initialize with default columns if missing
        const defaultCols = [
          { id: "col1", label: "Reference / Appendix" },
          { id: "col2", label: "Item Description" },
          { id: "col3", label: "Note" },
        ];
        const initialCols = data.columns?.length ? data.columns : defaultCols;
        const initialRows = data.rows || [];

        setColumns(initialCols);
        setRows(initialRows);

        // Save defaults immediately if envelope had no columns
        if (!data.columns?.length && snap.id) {
          await updateEnvelope(snap.id, { columns: defaultCols, rows: [] });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleColumnsChange = useCallback((newCols: ColumnDef[]) => {
    pushSnapshot();
    setColumns(newCols);
    setDirty(true);
  }, [pushSnapshot]);

  const handleRowsChange = useCallback((newRows: SheetRow[]) => {
    pushSnapshot();
    setRows(newRows);
    setDirty(true);
  }, [pushSnapshot]);

  const handleSave = useCallback(async () => {
    if (!envelope?.id) return;
    setSaving(true);
    try {
      await updateEnvelope(envelope.id, { columns, rows });
      setDirty(false);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  }, [envelope?.id, columns, rows]);

  // Auto-save with 1.5s debounce when dirty
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestColsRef = useRef(columns);
  const latestRowsRef = useRef(rows);
  latestColsRef.current = columns;
  latestRowsRef.current = rows;

  useEffect(() => {
    if (!dirty || !envelope?.id) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateEnvelope(envelope.id!, { columns: latestColsRef.current, rows: latestRowsRef.current });
        setDirty(false);
      } catch (err) {
        console.error("Auto-save failed:", err);
      } finally {
        setSaving(false);
      }
    }, 1500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [dirty, envelope?.id]);

  // ─── Export to Excel ──────────────────────────────────────────────────
  const exportToExcel = useCallback(() => {
    const headerRow = columns.map((c) => c.label);
    const dataRows = rows.map((row) =>
      columns.map((col) => row.cells[col.id] || "")
    );
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);

    // Auto-fit column widths
    const colWidths = columns.map((col, i) => {
      const maxLen = Math.max(
        col.label.length,
        ...rows.map((r) => (r.cells[col.id] || "").length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 12), 60) };
    });
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${envelope?.title || "envelope"}.xlsx`);
  }, [columns, rows, envelope?.title]);

  // ─── Import from Excel/CSV ────────────────────────────────────────────
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState<{ headers: string[]; data: string[][] } | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
        if (json.length < 2) { alert("File must have at least a header row and one data row."); return; }
        setImportData({ headers: json[0], data: json.slice(1).filter(r => r.some(c => c.trim())) });
      } catch { alert("Failed to parse file."); }
    };
    reader.readAsBinaryString(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) parseFile(files[0]); },
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "text/csv": [".csv"] },
    multiple: false,
  });

  const handlePasteImport = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    if (lines.length < 2) { alert("Paste at least a header row and one data row."); return; }
    const delim = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(delim).map(h => h.replace(/^"|"$/g, "").trim());
    const data = lines.slice(1).map(line => line.split(delim).map(v => v.replace(/^"|"$/g, "").trim()));
    setImportData({ headers, data });
  };

  const applyImport = () => {
    if (!importData) return;
    pushSnapshot();
    const newCols: ColumnDef[] = importData.headers.map((h, i) => ({
      id: `imp_${i}_${Date.now()}`,
      label: h,
    }));
    const colMap = importData.headers.map((h, i) => ({ header: h, colId: newCols[i].id }));
    const newRows: SheetRow[] = importData.data.map((row) => {
      const cells: Record<string, string> = {};
      colMap.forEach((m, i) => { cells[m.colId] = row[i] || ""; });
      return { id: `imp_${Date.now()}_${Math.random().toString(36).slice(2)}`, cells };
    });
    if (importMode === 'replace') {
      setColumns(newCols);
      setRows(newRows);
    } else {
      // Append: keep existing columns, add new ones, merge rows
      const mergedCols = [...columns];
      const newColMap: Record<string, string> = {};
      importData.headers.forEach((h, i) => {
        const existing = mergedCols.find(c => c.label === h);
        if (existing) newColMap[newCols[i].id] = existing.id;
        else {
          const c = newCols[i];
          mergedCols.push(c);
          newColMap[c.id] = c.id;
        }
      });
      setColumns(mergedCols);
      const mappedRows = newRows.map(r => {
        const cells: Record<string, string> = { ...r.cells };
        // Remap to existing column IDs where possible
        const newCells: Record<string, string> = {};
        Object.entries(cells).forEach(([k, v]) => {
          const targetId = newColMap[k] || k;
          newCells[targetId] = v;
        });
        return { ...r, cells: newCells };
      });
      setRows([...rows, ...mappedRows]);
    }
    setDirty(true);
    setShowImport(false);
    setImportData(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300 stroke-[1.5]" />
      </div>
    );
  }

  if (!envelope) return null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
          <Link href="/projects" className="hover:text-zinc-700 transition-colors">Projects</Link>
          <span className="text-zinc-300">/</span>
          {projectName ? (
            <Link href={`/projects/${projectId}`} className="hover:text-zinc-700 transition-colors truncate max-w-[200px]">{projectName}</Link>
          ) : (
            <span className="text-zinc-300">Loading...</span>
          )}
          <span className="text-zinc-300">/</span>
          <span className="text-zinc-700 font-medium truncate max-w-[250px]">{envelope.title}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-medium text-zinc-900">{envelope.title}</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              {rows.length} row{rows.length !== 1 ? "s" : ""} · {columns.length} column{columns.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="h-4 w-4 stroke-[1.5]" />
          </button>
          <button
            onClick={exportToExcel}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
            title="Export as Excel"
          >
            <Download className="h-4 w-4 stroke-[1.5]" />
            Export Excel
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
            title="Import from Excel or CSV"
          >
            <Upload className="h-4 w-4 stroke-[1.5]" />
            Import
          </button>
          <Link
            href={`/envelopes/${envelope.id}/dividers`}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <FileDown className="h-4 w-4 stroke-[1.5]" />
            Generate Dividers
          </Link>
          <Link
            href={`/envelopes/${envelope.id}/toc`}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <List className="h-4 w-4 stroke-[1.5]" />
            Table of Contents
          </Link>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[1.5]" />
                <span>Saving...</span>
              </>
            ) : dirty ? (
              <span className="text-zinc-300">Unsaved</span>
            ) : (
              <span className="text-zinc-400">Saved</span>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Spreadsheet */}
      {columns.length > 0 && (
        <SpreadsheetTable
          columns={columns}
          rows={rows}
          onColumnsChange={handleColumnsChange}
          onRowsChange={handleRowsChange}
        />
      )}

      {/* Empty state */}
      {columns.length === 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-sm text-zinc-400">No columns defined yet.</p>
        </div>
      )}

      {/* ─── Import Modal ────────────────────────────────────────────── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => { setShowImport(false); setImportData(null); }}>
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-lg border border-zinc-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-800">Import Data</h2>
              <button onClick={() => { setShowImport(false); setImportData(null); }} className="p-1 text-zinc-300 hover:text-zinc-500">
                <X className="h-5 w-5 stroke-[1.5]" />
              </button>
            </div>

            {!importData ? (
              <>
                {/* Paste area */}
                <textarea
                  className="w-full rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700 outline-none focus:border-zinc-400 resize-none"
                  rows={4}
                  placeholder="Paste from Excel or CSV here (header row + data rows)..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handlePasteImport((e.target as HTMLTextAreaElement).value);
                    }
                  }}
                />
                <p className="mt-1 text-xs text-zinc-400 mb-4">Press Ctrl+Enter to parse</p>

                {/* OR divider */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px flex-1 bg-zinc-200" />
                  <span className="text-xs text-zinc-400">or upload a file</span>
                  <span className="h-px flex-1 bg-zinc-200" />
                </div>

                {/* Dropzone */}
                <div {...getRootProps()} className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-zinc-400 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-6 w-6 text-zinc-300 stroke-[1.5]" />
                  <p className="mt-2 text-sm text-zinc-500">Drop .xlsx or .csv here, or click to browse</p>
                </div>
              </>
            ) : (
              <>
                {/* Preview */}
                <p className="text-sm text-zinc-500 mb-3">
                  <span className="font-medium text-zinc-700">{importData.data.length}</span> rows ·{' '}
                  <span className="font-medium text-zinc-700">{importData.headers.length}</span> columns
                </p>
                <div className="overflow-x-auto rounded-lg border border-zinc-200 max-h-60 overflow-y-auto mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200">
                        <th className="px-2 py-1.5 text-left text-zinc-400 font-medium">#</th>
                        {importData.headers.map((h, i) => (
                          <th key={i} className="px-2 py-1.5 text-left text-zinc-600 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.data.slice(0, 20).map((row, ri) => (
                        <tr key={ri} className="border-b border-zinc-100 last:border-0">
                          <td className="px-2 py-1 text-zinc-400">{ri + 1}</td>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-2 py-1 text-zinc-700 max-w-[150px] truncate">{cell || <span className="text-zinc-300">—</span>}</td>
                          ))}
                        </tr>
                      ))}
                      {importData.data.length > 20 && (
                        <tr><td colSpan={importData.headers.length + 1} className="px-2 py-2 text-center text-zinc-400">… and {importData.data.length - 20} more rows</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Replace / Append toggle */}
                <div className="flex items-center gap-4 mb-4">
                  <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                    <input type="radio" name="importMode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} className="accent-zinc-700" />
                    Replace current data
                  </label>
                  <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                    <input type="radio" name="importMode" checked={importMode === 'append'} onChange={() => setImportMode('append')} className="accent-zinc-700" />
                    Append to current data
                  </label>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={applyImport}
                    className="rounded-full border border-zinc-300 bg-transparent px-5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    {importMode === 'replace' ? 'Replace' : 'Append'}
                  </button>
                  <button
                    onClick={() => setImportData(null)}
                    className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

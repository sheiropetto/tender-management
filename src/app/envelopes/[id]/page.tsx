"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, FileDown, Undo2 } from "lucide-react";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateEnvelope, type Envelope, type ColumnDef, type SheetRow } from "@/lib/firestoreService";
import SpreadsheetTable from "@/components/SpreadsheetTable";

export default function EnvelopeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
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
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          Back to Project
        </Link>
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
          <Link
            href={`/envelopes/${envelope.id}/dividers`}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <FileDown className="h-4 w-4 stroke-[1.5]" />
            Generate Dividers
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
    </div>
  );
}

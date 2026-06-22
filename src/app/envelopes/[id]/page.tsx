"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, FileDown } from "lucide-react";
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
    setColumns(newCols);
    setDirty(true);
  }, []);

  const handleRowsChange = useCallback((newRows: SheetRow[]) => {
    setRows(newRows);
    setDirty(true);
  }, []);

  const handleSave = async () => {
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
          <Link
            href={`/envelopes/${envelope.id}/dividers`}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            <FileDown className="h-4 w-4 stroke-[1.5]" />
            Generate Dividers
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin stroke-[1.5]" />
            ) : (
              <Save className="h-4 w-4 stroke-[1.5]" />
            )}
            {saving ? "Saving..." : dirty ? "Save Changes" : "Saved"}
          </button>
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

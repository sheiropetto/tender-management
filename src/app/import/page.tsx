"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileSpreadsheet,
  Clipboard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Save,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { parseExcelFile, parsePastedData, type ParsedData } from "@/utils/parseExcel";
import { createProject } from "@/lib/firestoreService";

export default function ImportPage() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [projectName, setProjectName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Excel Upload ──────────────────────────────────────────────────────

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const data = await parseExcelFile(acceptedFiles[0]);
      setParsedData(data);
      setProjectName(data.sheetName || acceptedFiles[0].name.replace(/\.(xlsx|xls|csv)$/, ""));
    } catch (err: any) {
      setError(err.message || "Failed to parse file.");
    } finally {
      setLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
    },
    multiple: false,
  });

  // ─── Paste Parse ────────────────────────────────────────────────────────

  const handlePasteParse = () => {
    if (!pastedText.trim()) return;
    setError(null);
    setSuccess(null);
    try {
      const data = parsePastedData(pastedText);
      setParsedData(data);
      setProjectName("Imported Data");
    } catch (err: any) {
      setError(err.message || "Failed to parse pasted data.");
    }
  };

  // ─── Save to Firestore ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!parsedData || !projectName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const projectId = await createProject({
        name: projectName.trim(),
        refNumber: "",
        clientName: "",
        submissionDate: "",
        submissionTime: "",
        submissionAddress: "",
        budget: "",
        category: "",
        shortName: "",
        contactPersonName: "",
        contactPersonPhone: "",
        contactPersonEmail: "",
        clientRefNumber: "",
        status: "draft",
        description: "",
        hasEnvelopes: false,
      });
      setSuccess(`Project "${projectName}" saved successfully!`);
      setParsedData(null);
      setProjectName("");
      setPastedText("");
      // Store the new project ID for redirect
      window.location.href = `/projects#${projectId}`;
    } catch (err: any) {
      setError(err.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setParsedData(null);
    setError(null);
    setSuccess(null);
  };

  // ─── Preview Mode ──────────────────────────────────────────────────────

  if (parsedData) {
    return (
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-2xl font-bold text-zinc-900">Review Data</h1>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {parsedData.rows.length} rows parsed from{" "}
              <span className="font-medium">{parsedData.sheetName}</span>
            </p>
          </div>
        </div>

        {/* Project Name */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-zinc-500 mb-1">
            Project Name
          </label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full max-w-md rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
            placeholder="Enter project name..."
          />
        </div>

        {/* Preview Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50">
                  <th className="w-10 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    #
                  </th>
                  {parsedData.columns.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {parsedData.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-3 py-2.5 text-sm text-zinc-400">
                      {i + 1}
                    </td>
                    {parsedData.columns.map((col) => (
                      <td
                        key={col}
                        className="max-w-[200px] truncate px-3 py-2.5 text-sm text-zinc-700"
                        title={row[col]}
                      >
                        {row[col] || <span className="text-zinc-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !projectName.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saving..." : "Save Project"}
          </button>
          <Link
            href="/export"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            <Eye className="h-4 w-4" />
            Preview TOC & Dividers
          </Link>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {success}
          </div>
        )}
      </div>
    );
  }

  // ─── Import Screen ─────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Import Data</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Upload an Excel file or paste tabular data to create your tender document.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Excel */}
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all ${
            isDragActive
              ? "border-[#1a1a1a] bg-zinc-50"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            ) : (
              <FileSpreadsheet className="h-6 w-6 text-zinc-500" />
            )}
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">
            {isDragActive ? "Drop your file here" : "Upload Excel File"}
          </h3>
          <p className="mt-1 text-center text-sm text-zinc-500">
            Drag & drop your .xlsx, .xls, or .csv file here
            <br />
            or click to browse
          </p>
          <button className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50">
            <Upload className="h-4 w-4" />
            Choose File
          </button>
        </div>

        {/* Paste Data */}
        <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-white p-8 transition-all hover:border-zinc-300">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
            <Clipboard className="h-6 w-6 text-zinc-500" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-900">
            Paste Tabular Data
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Copy from Excel/Sheets and paste below. We&apos;ll parse it automatically.
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            className="mt-4 h-40 w-full resize-none rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            placeholder={`Paste your data here...\n\nExample:\nMain Title\tTitle\tDetails\nEnvelope 1\tForm A\tTechnical Proposal\nEnvelope 2\tForm B\tCommercial Proposal`}
          />
          <button
            onClick={handlePasteParse}
            disabled={!pastedText.trim()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Clipboard className="h-4 w-4" />
            Parse Data
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

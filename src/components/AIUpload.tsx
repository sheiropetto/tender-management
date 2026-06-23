"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Sparkles, Loader2, FileText, Upload, CheckCircle2, AlertCircle } from "lucide-react";

interface AIExtractedData {
  name?: string;
  shortName?: string;
  refNumber?: string;
  clientName?: string;
  submissionDate?: string;
  submissionTime?: string;
  submissionAddress?: string;
  budget?: string;
  category?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;
  clientRefNumber?: string;
  description?: string;
  envelopes?: string[];
  hasEnvelopes?: boolean;
}

interface AIUploadProps {
  onDataExtracted: (data: AIExtractedData) => void;
}

export default function AIUpload({ onDataExtracted }: AIUploadProps) {
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setProcessing(true);
    setStatus("processing");
    setFileName(file.name);
    setMessage("Extracting text from document...");
    setRawText("");
    setShowDebug(false);

    try {
      // Extract text from PDF using pdfjs-dist
      const text = await extractTextFromFile(file);
      setRawText(text.slice(0, 3000));

      if (!text || text.length < 20) {
        setStatus("error");
        setMessage("Could not extract enough text from this document.");
        setProcessing(false);
        return;
      }

      setMessage("Analyzing with AI...");

      const response = await fetch("/api/ai-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "AI extraction failed.");
        setProcessing(false);
        return;
      }

      setStatus("done");
      setMessage("Fields extracted successfully!");
      onDataExtracted(data);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to process document.");
    } finally {
      setProcessing(false);
    }
  }, [onDataExtracted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files[0] && processFile(files[0]),
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    multiple: false,
  });

  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-white/50 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400">
          <Sparkles className="h-4 w-4 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-zinc-700">AI Auto-Fill</h3>
          <p className="text-xs text-zinc-400">
            Upload a tender document (PDF, DOCX, TXT) to auto-fill the form.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed py-3 px-4 transition-colors ${
          isDragActive
            ? "border-zinc-400 bg-zinc-50"
            : status === "done"
            ? "border-zinc-200 bg-zinc-50/30"
            : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
        }`}
      >
        <input {...getInputProps()} disabled={processing} />

        {processing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400 stroke-[1.5]" />
            <div className="text-left">
              <p className="text-sm text-zinc-600">{message}</p>
              {fileName && <p className="text-xs text-zinc-400">{fileName}</p>}
            </div>
          </>
        ) : status === "done" ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-zinc-500 stroke-[1.5]" />
            <div className="text-left">
              <p className="text-sm text-zinc-700">{message}</p>
              {fileName && <p className="text-xs text-zinc-500">{fileName}</p>}
            </div>
          </>
        ) : status === "error" ? (
          <>
            <AlertCircle className="h-5 w-5 text-zinc-400 stroke-[1.5]" />
            <div className="text-left">
              <p className="text-sm text-red-600">{message}</p>
              <p className="text-xs text-zinc-400">Click or drop to try again</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-zinc-300 stroke-[1.5]" />
            <div className="text-left">
              <p className="text-sm text-zinc-500">
                {isDragActive ? "Drop your file here" : "Drop PDF/DOCX here or click to browse"}
              </p>
              <p className="text-xs text-zinc-300">Powered by DeepSeek AI</p>
            </div>
          </>
        )}
      </div>

      {/* Debug: show raw extracted text */}
      {(rawText || status === "error") && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowDebug(!showDebug)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {showDebug ? "▼ Hide" : "▶ Show"} raw extracted text ({rawText.length} chars)
          </button>
          {showDebug && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 whitespace-pre-wrap font-mono">
              {rawText || "No text extracted"}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Text Extraction ─────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return await file.text();
  }

  if (ext === "pdf") {
    return await extractPDFText(file);
  }

  if (ext === "docx") {
    // For DOCX, read as text to get basic content
    // For full DOCX support, consider using mammoth.js
    const text = await file.text();
    // Remove XML tags to get rough text content
    return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  throw new Error("Unsupported file format. Please use PDF, DOCX, or TXT.");
}

async function extractPDFText(file: File): Promise<string> {
  // Dynamic import for pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");

  // Set the worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by their Y position to preserve lines
    // Then sort items within each line by X position to preserve table columns
    const lineMap = new Map<number, { x: number; text: string }[]>();

    for (const item of content.items) {
      const tx = item as any;
      const y = Math.round(tx.transform[5]);
      const x = Math.round(tx.transform[4]);
      const text = tx.str;

      if (!lineMap.has(y)) {
        lineMap.set(y, []);
      }
      lineMap.get(y)!.push({ x, text });
    }

    // Sort Y positions descending (top to bottom)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lineMap.get(y)!;
      // Sort items by X position (left to right)
      items.sort((a, b) => a.x - b.x);
      // Join while preserving column gaps
      let line = "";
      let lastX = 0;
      for (const item of items) {
        const gap = item.x - lastX;
        if (item.x > lastX + 20) {
          // Significant gap = new column (use tab separators for tables)
          line += "\t" + item.text;
        } else if (item.x > lastX + 5) {
          line += "  " + item.text;
        } else {
          line += (line ? " " : "") + item.text;
        }
        lastX = item.x + item.text.length * 5;
      }
      fullText += line + "\n";
    }
    fullText += "\n";
  }

  return fullText.trim();
}

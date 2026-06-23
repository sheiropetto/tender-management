"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, Palette, Type, Database, Info, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getSettings, updateSettings, type AppSettings } from "@/lib/firestoreService";

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState("");
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontSize, setFontSize] = useState("12pt");
  const [borderThickness, setBorderThickness] = useState("Thick (3px)");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const loaded = useRef(false);

  // Load settings on mount
  useEffect(() => {
    getSettings().then((s) => {
      if (s.fontFamily) setFontFamily(s.fontFamily);
      if (s.fontSize) setFontSize(s.fontSize);
      if (s.borderThickness) setBorderThickness(s.borderThickness);
      loaded.current = true;
    });
  }, []);

  // Auto-save with 1s debounce
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateSettings({ fontFamily, fontSize, borderThickness });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        console.error("Failed to save settings:", err);
      } finally {
        setSaving(false);
      }
    }, 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [fontFamily, fontSize, borderThickness]);

  const handleClearAll = async () => {
    if (!confirm("Delete ALL data from Firestore? This cannot be undone.")) return;
    setClearing(true);
    setClearMsg("");
    try {
      const sectionsSnap = await getDocs(collection(db, "project_sections"));
      for (const d of sectionsSnap.docs) await deleteDoc(doc(db, "project_sections", d.id));
      const projectsSnap = await getDocs(collection(db, "projects"));
      for (const d of projectsSnap.docs) await deleteDoc(doc(db, "projects", d.id));
      setClearMsg(`Done! Deleted ${sectionsSnap.size} sections + ${projectsSnap.size} projects.`);
    } catch (err: any) {
      setClearMsg("Error: " + err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-medium text-zinc-900">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Configure your preferences and app settings.
        </p>
      </div>

      <div className="space-y-4">
        {/* Divider Defaults */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                <Type className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">
                  Divider Default Styles
                </h3>
                <p className="text-sm text-zinc-500">
                  Set default font, size, and preferences for dividers.
                </p>
              </div>
            </div>
            {/* Save status */}
            <div className="flex items-center gap-2 text-sm">
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin stroke-[1.5]" />
                  <span className="text-zinc-400">Saving...</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[1.5] text-zinc-500" />
                  <span className="text-zinc-500">Saved</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Font Family
              </label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
              >
                <option>Arial</option>
                <option>Helvetica</option>
                <option>Times New Roman</option>
                <option>Calibri</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Font Size
              </label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
              >
                <option>12pt</option>
                <option>14pt</option>
                <option>16pt</option>
                <option>18pt</option>
                <option>24pt</option>
                <option>36pt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Border Thickness
              </label>
              <select
                value={borderThickness}
                onChange={(e) => setBorderThickness(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
              >
                <option>Thin (1px)</option>
                <option>Medium (2px)</option>
                <option>Thick (3px)</option>
                <option>Extra Thick (4px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">
                TOC Color Palette
              </h3>
              <p className="text-sm text-zinc-500">
                Configure the color options available for TOC entries.
              </p>
            </div>
          </div>
        </div>

        {/* Database Connection */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">
                Database Connection
              </h3>
              <p className="text-sm text-zinc-500">
                Configure Firebase connection for data storage.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-zinc-400">
              {process.env.NEXT_PUBLIC_FIREBASE_API_KEY
                ? "✅ Connected"
                : "⚠️ Not configured — add .env.local variables"}
            </p>
          </div>
        </div>

        {/* About */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">
                About TenderDocs
              </h3>
              <p className="text-sm text-zinc-500">
                Version 0.1.0 — Tender Document Manager
              </p>
            </div>
          </div>
        </div>

        {/* Clear Data */}
        <div className="rounded-xl border border-red-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Clear All Data</h3>
              <p className="text-sm text-zinc-500">
                Delete all projects and sections from Firestore.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {clearing ? "Clearing..." : "Delete All Data"}
            </button>
            {clearMsg && <span className="text-sm text-zinc-500">{clearMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

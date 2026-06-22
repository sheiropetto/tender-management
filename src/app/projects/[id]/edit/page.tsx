"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Sparkles } from "lucide-react";
import { getProject, getEnvelopes, updateProject } from "@/lib/firestoreService";
import { collection, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AIUpload from "@/components/AIUpload";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    shortName: "",
    refNumber: "",
    clientName: "",
    submissionDate: "",
    submissionTime: "",
    submissionAddress: "",
    budget: "",
    category: "",
    contactPersonName: "",
    contactPersonPhone: "",
    contactPersonEmail: "",
    clientRefNumber: "",
    status: "draft" as "draft" | "submitted" | "awarded" | "lost",
    description: "",
  });
  const [hasEnvelopes, setHasEnvelopes] = useState(false);
  const [envelopes, setEnvelopes] = useState<{ id?: string; title: string }[]>([]);
  const [originalEnvIds, setOriginalEnvIds] = useState<string[]>([]);

  const updateForm = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const stripEnvelopePrefix = (title: string) =>
    title.replace(/^Envelope \d+: /, "");

  const updateEnvelope = (index: number, value: string) => {
    setEnvelopes((prev) => prev.map((e, i) => (i === index ? { ...e, title: value } : e)));
  };

  const addEnvelope = () =>
    setEnvelopes((prev) => [...prev, { title: `Envelope ${prev.length + 1}: ` }]);

  const removeEnvelope = (index: number) => {
    setEnvelopes((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return filtered.map((e, i) => ({
        ...e,
        title: `Envelope ${i + 1}: ${stripEnvelopePrefix(e.title)}`,
      }));
    });
  };

  useEffect(() => {
    const id = params.id as string;
    if (!id) return;

    Promise.all([getProject(id), getEnvelopes(id)])
      .then(([project, envs]) => {
        if (!project) {
          router.push("/projects");
          return;
        }
        setForm({
          name: project.name || "",
          shortName: project.shortName || "",
          refNumber: project.refNumber || "",
          clientName: project.clientName || "",
          submissionDate: project.submissionDate || "",
          submissionTime: project.submissionTime || "",
          submissionAddress: project.submissionAddress || "",
          budget: project.budget || "",
          category: project.category || "",
          contactPersonName: project.contactPersonName || "",
          contactPersonPhone: project.contactPersonPhone || "",
          contactPersonEmail: project.contactPersonEmail || "",
          clientRefNumber: project.clientRefNumber || "",
          status: project.status || "draft",
          description: project.description || "",
        });
        setHasEnvelopes(project.hasEnvelopes);
        const envList = envs.map((e) => ({ id: e.id, title: e.title }));
        setEnvelopes(envList);
        setOriginalEnvIds(envList.filter((e) => e.id).map((e) => e.id!));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const projectId = params.id as string;

      await updateProject(projectId, {
        name: form.name.trim(),
        shortName: form.shortName.trim() || form.name.trim(),
        refNumber: form.refNumber.trim(),
        clientName: form.clientName.trim(),
        submissionDate: form.submissionDate,
        submissionTime: form.submissionTime,
        submissionAddress: form.submissionAddress.trim(),
        budget: form.budget.trim(),
        category: form.category,
        contactPersonName: form.contactPersonName.trim(),
        contactPersonPhone: form.contactPersonPhone.trim(),
        contactPersonEmail: form.contactPersonEmail.trim(),
        clientRefNumber: form.clientRefNumber.trim(),
        status: form.status,
        description: form.description.trim(),
        hasEnvelopes,
      });

      // Sync envelopes
      const currentIds = envelopes.filter((e) => e.id).map((e) => e.id!);

      // Delete removed envelopes
      const toDelete = originalEnvIds.filter((id) => !currentIds.includes(id));
      await Promise.all(toDelete.map((eid) => deleteDoc(doc(db, "envelopes", eid))));

      // Update existing + add new envelopes
      await Promise.all(
        envelopes.map((env, i) => {
          if (env.id) {
            return updateDoc(doc(db, "envelopes", env.id), {
              title: env.title,
              sortOrder: i,
            });
          } else {
            return addDoc(collection(db, "envelopes"), {
              projectId,
              title: env.title,
              sortOrder: i,
              createdAt: new Date(),
            });
          }
        })
      );

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error("Failed to update project:", err);
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

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 stroke-[1.5]" />
          Back to Project
        </Link>
        <h1 className="text-xl font-medium text-zinc-900">Edit Project</h1>
        <p className="mt-0.5 text-sm text-zinc-400">
          Update the project details below.
        </p>
      </div>

      {/* AI Auto-Fill */}
      <div className="mb-6">
        <AIUpload onDataExtracted={(data) => {
          if (data.name) updateForm("name", data.name);
          if (data.shortName) updateForm("shortName", data.shortName);
          if (data.refNumber) updateForm("refNumber", data.refNumber);
          if (data.clientName) updateForm("clientName", data.clientName);
          if (data.submissionDate) updateForm("submissionDate", data.submissionDate);
          if (data.submissionTime) updateForm("submissionTime", data.submissionTime);
          if (data.submissionAddress) updateForm("submissionAddress", data.submissionAddress);
          if (data.budget) updateForm("budget", data.budget);
          if (data.category) updateForm("category", data.category);
          if (data.contactPersonName) updateForm("contactPersonName", data.contactPersonName);
          if (data.contactPersonPhone) updateForm("contactPersonPhone", data.contactPersonPhone);
          if (data.contactPersonEmail) updateForm("contactPersonEmail", data.contactPersonEmail);
          if (data.clientRefNumber) updateForm("clientRefNumber", data.clientRefNumber);
          if (data.description) updateForm("description", data.description);
          // Auto-create envelopes from AI
          if (data.hasEnvelopes && data.envelopes?.length) {
            setHasEnvelopes(true);
            setEnvelopes(data.envelopes.map((title: string, i: number) => ({
              title: `Envelope ${i + 1}: ${title.replace(/^Envelope \d+:\s*/i, "")}`,
            })));
          }
        }} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Project Name <span className="text-zinc-300">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            required
          />
        </div>

        {/* Short Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Short Name <span className="text-zinc-300">(displayed in lists)</span>
          </label>
          <input
            type="text"
            value={form.shortName}
            onChange={(e) => updateForm("shortName", e.target.value)}
            placeholder="e.g. UMPSA Residential Colleges"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Ref Number + Client Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Reference Number
            </label>
            <input
              type="text"
              value={form.refNumber}
              onChange={(e) => updateForm("refNumber", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Client / Company
            </label>
            <input
              type="text"
              value={form.clientName}
              onChange={(e) => updateForm("clientName", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Date + Time of Submission */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Date of Submission
            </label>
            <input
              type="date"
              value={form.submissionDate}
              onChange={(e) => updateForm("submissionDate", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Submission Time
            </label>
            <input
              type="time"
              value={form.submissionTime}
              onChange={(e) => updateForm("submissionTime", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Status + Category */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="awarded">Awarded</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => updateForm("category", e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 focus:border-zinc-400 focus:outline-none transition-colors"
            >
              <option value="">Select category</option>
              <option value="infrastructure">Infrastructure</option>
              <option value="consultancy">Consultancy</option>
              <option value="supply">Supply & Delivery</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Budget + Client Ref */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Budget / Value (RM)
            </label>
            <input
              type="text"
              value={form.budget}
              onChange={(e) => updateForm("budget", e.target.value)}
              placeholder="e.g. 5,000,000"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">
              Client Ref Number
            </label>
            <input
              type="text"
              value={form.clientRefNumber}
              onChange={(e) => updateForm("clientRefNumber", e.target.value)}
              placeholder="e.g. JKR/2025/123"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Contact Person Name */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Contact Person Name
          </label>
          <input
            type="text"
            value={form.contactPersonName}
            onChange={(e) => updateForm("contactPersonName", e.target.value)}
            placeholder="e.g. Ahmad bin Ismail"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Contact Person Phone */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Contact Person Phone
          </label>
          <input
            type="text"
            value={form.contactPersonPhone}
            onChange={(e) => updateForm("contactPersonPhone", e.target.value)}
            placeholder="e.g. 012-345 6789"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Contact Person Email */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Contact Person Email
          </label>
          <input
            type="text"
            value={form.contactPersonEmail}
            onChange={(e) => updateForm("contactPersonEmail", e.target.value)}
            placeholder="e.g. contact@example.com"
            className="w-full rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Submission Address */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Submission Address
          </label>
          <textarea
            value={form.submissionAddress}
            onChange={(e) => updateForm("submissionAddress", e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* With Envelope Toggle */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Envelopes
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setHasEnvelopes(!hasEnvelopes)}
              className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                hasEnvelopes ? "bg-zinc-100 text-zinc-800" : "bg-zinc-200 text-zinc-400"
              }`}
            >
              <span
                className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform ${
                  hasEnvelopes ? "translate-x-[22px]" : "translate-x-[2px]"
                }`}
              />
            </button>
            <span className="text-sm text-zinc-600">
              {hasEnvelopes ? "With Envelopes" : "No Envelopes"}
            </span>
          </div>
        </div>

        {/* Envelope Titles */}
        {hasEnvelopes && (
          <div className="pl-4 border-l-2 border-zinc-200 space-y-3">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Envelope Titles
            </p>
            {envelopes.map((env, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={env.title}
                  onChange={(e) => updateEnvelope(i, e.target.value)}
                  placeholder={`Envelope ${i + 1}: Introduction`}
                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeEnvelope(i)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 stroke-[1.5]" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addEnvelope}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4 stroke-[1.5]" />
              Add Envelope
            </button>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            Description / Notes
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 placeholder-zinc-300 focus:border-zinc-400 focus:outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
          <Link
            href={`/projects/${params.id}`}
            className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-transparent px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin stroke-[1.5]" />
            ) : (
              <Save className="h-4 w-4 stroke-[1.5]" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

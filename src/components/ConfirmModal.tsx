"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
          <button
            onClick={onCancel}
            className="flex h-6 w-6 items-center justify-center rounded-full text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>
        <p className="text-sm text-zinc-500 mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

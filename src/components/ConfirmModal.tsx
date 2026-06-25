"use client";

import { X } from "lucide-react";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  loadingLabel?: string;
  confirmVariant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Delete",
  loadingLabel,
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  const confirmBtnClasses = confirmVariant === "danger"
    ? "rounded-full border border-red-200 text-red-600 bg-transparent hover:bg-red-50 hover:border-red-300 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
    : "rounded-full border border-zinc-300 text-zinc-700 bg-transparent hover:bg-zinc-50 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";

  const defaultLoadingLabel = loadingLabel || (confirmVariant === "danger" ? "Deleting..." : "Confirming...");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onCancel} />
      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg text-center flex flex-col items-center">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center rounded-full text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          <X className="h-4 w-4 stroke-[1.5]" />
        </button>

        {/* Content */}
        <h3 className="text-sm font-medium text-zinc-900 mb-2 mt-2 w-full text-center">
          {title}
        </h3>
        <p className="text-sm text-zinc-500 mb-6 w-full text-center px-2">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2.5 w-full">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full border border-zinc-200 bg-transparent px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={confirmBtnClasses}
          >
            {loading ? defaultLoadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

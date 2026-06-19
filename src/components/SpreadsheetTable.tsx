"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import type { ColumnDef, SheetRow } from "@/lib/firestoreService";

interface SpreadsheetTableProps {
  columns: ColumnDef[];
  rows: SheetRow[];
  onColumnsChange: (columns: ColumnDef[]) => void;
  onRowsChange: (rows: SheetRow[]) => void;
}

let idCounter = Date.now();
const genId = () => `id_${idCounter++}`;

export default function SpreadsheetTable({
  columns,
  rows,
  onColumnsChange,
  onRowsChange,
}: SpreadsheetTableProps) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [colLabel, setColLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCol && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCol]);

  // ─── Columns ───────────────────────────────────────────────────────────

  const addColumn = () => {
    const id = genId();
    onColumnsChange([...columns, { id, label: `Column ${columns.length + 1}` }]);
  };

  const deleteColumn = (colId: string) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((c) => c.id !== colId);
    const newRows = rows.map((r) => {
      const { [colId]: _, ...rest } = r.cells;
      return { ...r, cells: rest };
    });
    onColumnsChange(newCols);
    onRowsChange(newRows);
  };

  const startEditCol = (col: ColumnDef) => {
    setEditingCol(col.id);
    setColLabel(col.label);
  };

  const finishEditCol = () => {
    if (editingCol) {
      onColumnsChange(
        columns.map((c) => (c.id === editingCol ? { ...c, label: colLabel || c.label } : c))
      );
    }
    setEditingCol(null);
  };

  // ─── Rows ──────────────────────────────────────────────────────────────

  const addRow = () => {
    const cells: Record<string, string> = {};
    columns.forEach((c) => (cells[c.id] = ""));
    onRowsChange([...rows, { id: genId(), cells }]);
  };

  const insertRowAbove = (index: number) => {
    const cells: Record<string, string> = {};
    columns.forEach((c) => (cells[c.id] = ""));
    const newRows = [...rows];
    newRows.splice(index, 0, { id: genId(), cells });
    onRowsChange(newRows);
  };

  const deleteRow = (rowId: string) => {
    if (rows.length <= 1) return;
    onRowsChange(rows.filter((r) => r.id !== rowId));
  };

  const updateCell = (rowId: string, colId: string, value: string) => {
    onRowsChange(
      rows.map((r) =>
        r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: value } } : r
      )
    );
  };

  // ─── Drag-to-reorder (simple arrow-based) ─────────────────────────────

  const moveCol = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;
    const newCols = [...columns];
    [newCols[index], newCols[target]] = [newCols[target], newCols[index]];
    onColumnsChange(newCols);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full border-collapse">
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th className="w-8 px-1 py-2 text-xs text-zinc-300">#</th>
            {columns.map((col, i) => (
              <th key={col.id} className="relative min-w-[160px] border-r border-zinc-200 last:border-r-0 px-2 py-2">
                {editingCol === col.id ? (
                  <input
                    ref={editInputRef}
                    value={colLabel}
                    onChange={(e) => setColLabel(e.target.value)}
                    onBlur={finishEditCol}
                    onKeyDown={(e) => e.key === "Enter" && finishEditCol()}
                    className="w-full rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs font-medium text-zinc-800 outline-none"
                  />
                ) : (
                  <div
                    onClick={() => startEditCol(col)}
                    className="cursor-text text-xs font-medium text-zinc-600 hover:text-zinc-900 truncate"
                    title="Click to rename"
                  >
                    {col.label}
                  </div>
                )}
                {/* Column actions */}
                <div className="absolute right-1 top-1 flex items-center gap-0.5 opacity-0 group-hover/th:opacity-100">
                  <button
                    onClick={() => moveCol(i, -1)}
                    disabled={i === 0}
                    className="flex h-4 w-4 items-center justify-center rounded text-zinc-300 hover:text-zinc-600 disabled:opacity-20"
                    title="Move left"
                  >
                    ◀
                  </button>
                  <button
                    onClick={() => moveCol(i, 1)}
                    disabled={i === columns.length - 1}
                    className="flex h-4 w-4 items-center justify-center rounded text-zinc-300 hover:text-zinc-600 disabled:opacity-20"
                    title="Move right"
                  >
                    ▶
                  </button>
                  {columns.length > 1 && (
                    <button
                      onClick={() => deleteColumn(col.id)}
                      className="flex h-4 w-4 items-center justify-center rounded text-zinc-300 hover:text-red-500"
                      title="Delete column"
                    >
                      <X className="h-3 w-3 stroke-[1.5]" />
                    </button>
                  )}
                </div>
              </th>
            ))}
            {/* Add column button */}
            <th className="w-10 px-1 py-2">
              <button
                onClick={addColumn}
                className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 hover:bg-zinc-200 hover:text-zinc-600 transition-colors"
                title="Add column"
              >
                <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
              </button>
            </th>
          </tr>
        </thead>

        {/* ─── Body ───────────────────────────────────────────────────── */}
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 group">
              <td className="px-1 py-2 text-xs text-zinc-300 align-top pt-3">
                {i + 1}
              </td>
              {columns.map((col) => (
                <td key={col.id} className="border-r border-zinc-100 last:border-r-0 px-2 py-1">
                  <textarea
                    value={row.cells[col.id] || ""}
                    onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                    rows={1}
                    className="w-full resize-none border-0 bg-transparent px-1 py-1.5 text-sm text-zinc-700 outline-none focus:ring-0 placeholder-zinc-300"
                    placeholder="—"
                  />
                </td>
              ))}
              {/* Row actions */}
              <td className="w-10 px-1 py-1 align-top pt-2.5">
                <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => insertRowAbove(i)}
                    className="flex h-5 w-5 items-center justify-center rounded text-zinc-300 hover:bg-zinc-200 hover:text-zinc-600"
                    title="Insert row above"
                  >
                    <Plus className="h-3 w-3 stroke-[1.5]" />
                  </button>
                  {rows.length > 1 && (
                    <button
                      onClick={() => deleteRow(row.id)}
                      className="flex h-5 w-5 items-center justify-center rounded text-zinc-300 hover:bg-red-50 hover:text-red-500"
                      title="Delete row"
                    >
                      <Trash2 className="h-3 w-3 stroke-[1.5]" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row button */}
      <div className="px-2 py-2 border-t border-zinc-100">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
          Add Row
        </button>
      </div>
    </div>
  );
}

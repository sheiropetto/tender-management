"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, X, GripVertical } from "lucide-react";
import type { ColumnDef, SheetRow } from "@/lib/firestoreService";

interface SpreadsheetTableProps {
  columns: ColumnDef[];
  rows: SheetRow[];
  onColumnsChange: (columns: ColumnDef[]) => void;
  onRowsChange: (rows: SheetRow[]) => void;
}

let idCounter = Date.now();
const genId = () => `id_${idCounter++}`;

// Measure text width using canvas
function measureText(text: string, fontSize = 13): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * 8;
  ctx.font = `${fontSize}px sans-serif`;
  return ctx.measureText(text).width + 24; // padding
}

export default function SpreadsheetTable({
  columns,
  rows,
  onColumnsChange,
  onRowsChange,
}: SpreadsheetTableProps) {
  const [editingCol, setEditingCol] = useState<string | null>(null);
  const [colLabel, setColLabel] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizing = useRef<{ colId: string; startX: number; startW: number } | null>(null);
  const [frozenCols, setFrozenCols] = useState(1); // freeze first column

  // ─── Drag reorder state ──────────────────────────────────────────────
  const dragCol = useRef<{ index: number } | null>(null);
  const dragRow = useRef<{ index: number } | null>(null);

  useEffect(() => {
    if (editingCol && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCol]);

  // ─── Column resize ─────────────────────────────────────────────────────

  const handleResizeStart = useCallback((colId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.target as HTMLElement).closest("th");
    const startW = th?.offsetWidth || 160;
    resizing.current = { colId, startX: e.clientX, startW };

    const onMouseMove = (me: MouseEvent) => {
      if (!resizing.current) return;
      const diff = me.clientX - resizing.current.startX;
      const newW = Math.max(80, resizing.current.startW + diff);
      setColWidths((prev) => ({ ...prev, [colId]: newW }));
    };

    const onMouseUp = () => {
      resizing.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  // ─── Auto-fit column on double-click ──────────────────────────────────

  const autoFitColumn = useCallback((colId: string) => {
    const colIndex = columns.findIndex((c) => c.id === colId);
    if (colIndex === -1) return;
    const headerW = measureText(columns[colIndex].label, 11) + 40;
    let maxW = headerW;
    rows.forEach((row) => {
      const text = row.cells[colId] || "";
      const w = measureText(text, 13);
      if (w > maxW) maxW = w;
    });
    setColWidths((prev) => ({ ...prev, [colId]: Math.max(80, Math.min(450, maxW)) }));
  }, [columns, rows]);

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

  // ─── Drag-to-reorder columns ──────────────────────────────────────────

  const handleColDragStart = (index: number) => {
    dragCol.current = { index };
  };

  const handleColDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!dragCol.current || dragCol.current.index === index) return;
    const newCols = [...columns];
    const [moved] = newCols.splice(dragCol.current.index, 1);
    newCols.splice(index, 0, moved);
    onColumnsChange(newCols);
    dragCol.current.index = index;
  };

  const handleColDragEnd = () => {
    dragCol.current = null;
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

  // ─── Drag-to-reorder rows ─────────────────────────────────────────────

  const handleRowDragStart = (index: number) => {
    dragRow.current = { index };
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (!dragRow.current || dragRow.current.index === index) return;
    const newRows = [...rows];
    const [moved] = newRows.splice(dragRow.current.index, 1);
    newRows.splice(index, 0, moved);
    onRowsChange(newRows);
    dragRow.current.index = index;
  };

  const handleRowDragEnd = () => {
    dragRow.current = null;
  };

  // ─── Select column cells on header click ──────────────────────────────

  const selectColumnCells = (colId: string) => {
    // Select all text in the column
    const textareas = document.querySelectorAll<HTMLTextAreaElement>(
      `[data-col-id="${colId}"]`
    );
    if (textareas.length === 0) return;
    // Focus the first one and select its content
    textareas[0].focus();
    textareas[0].select();
  };

  // ─── Paste from Excel/Sheets ──────────────────────────────────────────

  const handlePaste = (e: React.ClipboardEvent, startRowId: string, startColId: string) => {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.includes("\t") && !pasted.includes("\n")) return;

    e.preventDefault();

    const lines = pasted.split(/\r?\n/).filter((l) => l.trim() !== "" || pasted.includes("\t"));
    const grid = lines.map((line) => line.split("\t"));

    if (grid.length === 0) return;

    const startRowIndex = rows.findIndex((r) => r.id === startRowId);
    const startColIndex = columns.findIndex((c) => c.id === startColId);
    if (startRowIndex === -1 || startColIndex === -1) return;

    const numPasteCols = Math.max(...grid.map((r) => r.length));

    let newCols = [...columns];
    const neededCols = startColIndex + numPasteCols - columns.length;
    for (let i = 0; i < neededCols; i++) {
      const id = genId();
      newCols.push({ id, label: `Column ${newCols.length + 1}` });
    }

    let newRows = [...rows];
    const neededRows = startRowIndex + grid.length - rows.length;
    for (let i = 0; i < neededRows; i++) {
      const cells: Record<string, string> = {};
      newCols.forEach((c) => (cells[c.id] = ""));
      newRows.push({ id: genId(), cells });
    }

    for (let ri = 0; ri < grid.length; ri++) {
      const rowIdx = startRowIndex + ri;
      for (let ci = 0; ci < grid[ri].length; ci++) {
        const colIdx = startColIndex + ci;
        if (newRows[rowIdx] && newCols[colIdx]) {
          newRows[rowIdx].cells[newCols[colIdx].id] = grid[ri][ci];
        }
      }
    }

    onColumnsChange(newCols);
    onRowsChange(newRows);
  };

  // ─── Toggle frozen columns ────────────────────────────────────────────

  const toggleFrozen = () => {
    setFrozenCols((prev) => (prev === 0 ? 1 : 0));
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white relative">
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50">
            <th
              className={`w-10 px-1 py-2 text-xs text-zinc-400 font-medium ${frozenCols > 0 ? 'sticky left-0 z-20 bg-zinc-50' : ''}`}
            >
              <div className="flex items-center gap-1">
                <span>#</span>
                <button
                  onClick={toggleFrozen}
                  className={`text-[9px] px-1 rounded transition-colors ${frozenCols > 0 ? 'text-zinc-600 bg-zinc-200' : 'text-zinc-300 hover:text-zinc-500'}`}
                  title={frozenCols > 0 ? "Unfreeze" : "Freeze column"}
                >
                  📌
                </button>
              </div>
            </th>
            {columns.map((col, i) => (
              <th
                key={col.id}
                className={`relative border-r border-zinc-200 last:border-r-0 px-2 py-2 group select-none ${
                  frozenCols > 0 && i < frozenCols ? 'sticky z-10 bg-zinc-50' : ''
                }`}
                style={{
                  width: colWidths[col.id] || 160,
                  minWidth: 80,
                  left: frozenCols > 0 && i < frozenCols ? (i === 0 ? '40px' : `${40 + (colWidths[columns[0]?.id] || 160)}px`) : undefined,
                }}
                draggable
                onDragStart={() => handleColDragStart(i)}
                onDragOver={(e) => handleColDragOver(e, i)}
                onDragEnd={handleColDragEnd}
              >
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => handleResizeStart(col.id, e)}
                  onDoubleClick={() => autoFitColumn(col.id)}
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-zinc-300/50"
                  style={{ transform: 'translateX(50%)' }}
                  title="Drag to resize · Double-click to auto-fit"
                />

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
                    onClick={() => {
                      startEditCol(col);
                      selectColumnCells(col.id);
                    }}
                    className="cursor-pointer text-xs font-medium text-zinc-600 hover:text-zinc-900 truncate pr-4"
                    title="Click to rename · Shift+click to select cells"
                  >
                    <GripVertical className="h-3 w-3 stroke-[1] text-zinc-300 inline mr-1 cursor-grab" />
                    {col.label}
                  </div>
                )}
                {/* Column actions */}
                <div className="absolute right-2 top-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {columns.length > 1 && (
                    <button
                      onClick={() => deleteColumn(col.id)}
                      className="flex h-4 w-4 items-center justify-center rounded text-zinc-300 hover:text-red-500 transition-colors"
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
            <tr
              key={row.id}
              className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 group"
              draggable
              onDragStart={() => handleRowDragStart(i)}
              onDragOver={(e) => handleRowDragOver(e, i)}
              onDragEnd={handleRowDragEnd}
            >
              <td
                className={`px-1 py-2 text-xs text-zinc-400 align-top pt-3 cursor-grab ${
                  frozenCols > 0 ? 'sticky left-0 z-10 bg-white group-hover:bg-zinc-50/50' : ''
                }`}
                style={{ width: 40 }}
              >
                {i + 1}
              </td>
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={`border-r border-zinc-100 last:border-r-0 px-2 py-1 ${
                    frozenCols > 0 && columns.indexOf(col) < frozenCols ? 'sticky z-10 bg-white group-hover:bg-zinc-50/50' : ''
                  }`}
                  style={{
                    width: colWidths[col.id] || 160,
                    left: frozenCols > 0 && columns.indexOf(col) < frozenCols
                      ? (columns.indexOf(col) === 0 ? '40px' : `${40 + (colWidths[columns[0]?.id] || 160)}px`)
                      : undefined,
                  }}
                >
                  <textarea
                    value={row.cells[col.id] || ""}
                    onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                    onPaste={(e) => handlePaste(e, row.id, col.id)}
                    data-col-id={col.id}
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
  );
}

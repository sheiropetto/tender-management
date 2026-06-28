"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, X, GripVertical, Pin, Printer, Search, ArrowUp, ArrowDown, Replace, MoreVertical, Check } from "lucide-react";
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
  const [frozenCols, setFrozenCols] = useState(1);
  const [openColMenu, setOpenColMenu] = useState<string | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!openColMenu && !openRowMenu) return;
    const close = () => {
      setOpenColMenu(null);
      setOpenRowMenu(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openColMenu, openRowMenu]);

  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // ─── Selection state ──────────────────────────────────────────────────
  const [selection, setSelection] = useState<{ sr: number; sc: number; er: number; ec: number } | null>(null);
  const selecting = useRef(false);
  const selectAnchor = useRef<{ r: number; c: number } | null>(null);

  // ─── Column type editing ──────────────────────────────────────────────
  const [editingColType, setEditingColType] = useState<string | null>(null);

  // ─── Drag reorder state ──────────────────────────────────────────────
  const dragCol = useRef<{ index: number } | null>(null);
  const dragRow = useRef<{ index: number } | null>(null);

  // ─── Row selection ───────────────────────────────────────────────────
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const toggleRowSelect = (i: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  };

  const deleteSelectedRows = () => {
    if (selectedRows.size === 0) return;
    if (selectedRows.size === rows.length) {
      // Clear all — keep one empty row
      const cells: Record<string, string> = {};
      columns.forEach((c) => (cells[c.id] = ""));
      onRowsChange([{ id: genId(), cells }]);
    } else {
      const indices = Array.from(selectedRows).sort((a, b) => b - a);
      const newRows = [...rows];
      indices.forEach((i) => { newRows.splice(i, 1); });
      onRowsChange(newRows);
    }
    setSelectedRows(new Set());
  };

  // ─── Find & Replace ──────────────────────────────────────────────────
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingCol && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCol]);

  // Auto-fit all columns on mount when data is ready
  useEffect(() => {
    if (columns.length === 0) return;
    const widths: Record<string, number> = {};
    columns.forEach((col) => {
      const headerW = measureText(col.label, 11) + 40;
      let maxW = headerW;
      rows.forEach((row) => {
        const text = row.cells[col.id] || "";
        const w = measureText(text, 13);
        if (w > maxW) maxW = w;
      });
      widths[col.id] = Math.max(120, Math.min(600, maxW));
    });
    setColWidths(widths);
  }, [columns.length, rows.length]);

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
    setColWidths((prev) => ({ ...prev, [colId]: Math.max(80, Math.min(600, maxW)) }));
  }, [columns, rows]);

  // ─── Row height resize ────────────────────────────────────────────────
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const resizingRow = useRef<{ id: string; startY: number; startH: number } | null>(null);

  const handleRowResizeStart = useCallback((rowId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const tr = (e.target as HTMLElement).closest("tr");
    const startH = tr?.offsetHeight || 0;
    resizingRow.current = { id: rowId, startY: e.clientY, startH };

    const onMouseMove = (me: MouseEvent) => {
      if (!resizingRow.current) return;
      const diff = me.clientY - resizingRow.current.startY;
      const newH = Math.max(40, resizingRow.current.startH + diff);
      setRowHeights((prev) => ({ ...prev, [rowId]: newH }));
    };

    const onMouseUp = () => {
      resizingRow.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

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

  const insertRowBelow = (index: number) => {
    const cells: Record<string, string> = {};
    columns.forEach((c) => (cells[c.id] = ""));
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { id: genId(), cells });
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

  // ─── Selection handlers ───────────────────────────────────────────────

  const isSelected = (r: number, c: number) => {
    if (!selection) return false;
    const minR = Math.min(selection.sr, selection.er);
    const maxR = Math.max(selection.sr, selection.er);
    const minC = Math.min(selection.sc, selection.ec);
    const maxC = Math.max(selection.sc, selection.ec);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const handleCellMouseDown = (r: number, c: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectAnchor.current) {
      setSelection({ sr: selectAnchor.current.r, sc: selectAnchor.current.c, er: r, ec: c });
      return;
    }
    selectAnchor.current = { r, c };
    selecting.current = true;
    setSelection({ sr: r, sc: c, er: r, ec: c });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (!selecting.current || !selectAnchor.current) return;
    setSelection({ sr: selectAnchor.current.r, sc: selectAnchor.current.c, er: r, ec: c });
  };

  // ─── Clipboard ────────────────────────────────────────────────────────

  const copySelection = () => {
    if (!selection) return;
    const minR = Math.min(selection.sr, selection.er);
    const maxR = Math.max(selection.sr, selection.er);
    const minC = Math.min(selection.sc, selection.ec);
    const maxC = Math.max(selection.sc, selection.ec);
    const lines: string[] = [];
    for (let r = minR; r <= maxR; r++) {
      const cells: string[] = [];
      for (let c = minC; c <= maxC; c++) {
        cells.push(rows[r]?.cells[columns[c]?.id] || "");
      }
      lines.push(cells.join("\t"));
    }
    navigator.clipboard.writeText(lines.join("\n"));
  };

  const cutSelection = () => {
    if (!selection) return;
    copySelection();
    clearSelection();
  };

  const clearSelection = () => {
    if (!selection) return;
    const minR = Math.min(selection.sr, selection.er);
    const maxR = Math.max(selection.sr, selection.er);
    const minC = Math.min(selection.sc, selection.ec);
    const maxC = Math.max(selection.sc, selection.ec);
    const newRows = [...rows];
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const colId = columns[c]?.id;
        if (colId && newRows[r]) {
          newRows[r] = { ...newRows[r], cells: { ...newRows[r].cells, [colId]: "" } };
        }
      }
    }
    onRowsChange(newRows);
  };



  // Clear selection on mouseup anywhere
  useEffect(() => {
    const up = () => { selecting.current = false; };
    document.addEventListener('mouseup', up);
    return () => document.removeEventListener('mouseup', up);
  }, []);



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

  const performPaste = useCallback((pasted: string, startRowId: string, startColId: string) => {
    if (!pasted.includes("\t") && !pasted.includes("\n")) return false;

    const lines = pasted.split(/\r?\n/).filter((l) => l.trim() !== "" || pasted.includes("\t"));
    const grid = lines.map((line) => line.split("\t"));

    if (grid.length === 0) return false;

    const startRowIndex = rows.findIndex((r) => r.id === startRowId);
    const startColIndex = columns.findIndex((c) => c.id === startColId);
    if (startRowIndex === -1 || startColIndex === -1) return false;

    const numPasteCols = Math.max(...grid.map((r) => r.length));

    const newCols = [...columns];
    const neededCols = startColIndex + numPasteCols - columns.length;
    for (let i = 0; i < neededCols; i++) {
      const id = genId();
      newCols.push({ id, label: `Column ${newCols.length + 1}` });
    }

    const newRows = [...rows];
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
    return true;
  }, [columns, rows, onColumnsChange, onRowsChange]);

  const handlePaste = (e: React.ClipboardEvent, startRowId: string, startColId: string) => {
    const pasted = e.clipboardData.getData("text");
    if (performPaste(pasted, startRowId, startColId)) {
      e.preventDefault();
    }
  };

  // Global paste handler on active selection
  useEffect(() => {
    const handleGlobalPasteEvent = (e: ClipboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') return; // native paste handles it
      if (!selection) return;

      const pasted = e.clipboardData?.getData("text");
      if (!pasted) return;

      const minR = Math.min(selection.sr, selection.er);
      const minC = Math.min(selection.sc, selection.ec);
      const startRow = rows[minR];
      const startCol = columns[minC];
      if (startRow && startCol) {
        if (performPaste(pasted, startRow.id, startCol.id)) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('paste', handleGlobalPasteEvent);
    return () => document.removeEventListener('paste', handleGlobalPasteEvent);
  }, [selection, columns, rows, performPaste]);

  // ─── Auto-resize textarea ─────────────────────────────────────────

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  };

  // ─── Auto-resize all textareas on rows change (initial load, paste, etc.) ─
  useEffect(() => {
    // Use rAF to wait for DOM to paint after state update
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>('textarea[data-row-id]').forEach(autoResize);
    });
    return () => cancelAnimationFrame(raf);
  }, [rows, colWidths]);

  // ─── Toggle frozen columns ────────────────────────────────────────────

  const toggleFrozen = () => {
    setFrozenCols((prev) => (prev === 0 ? 1 : 0));
  };

  // ─── Find & Replace — logic ──────────────────────────────────────────
  const matches = useMemo(() => {
    if (!findText) return [];
    const lower = findText.toLowerCase();
    const m: { row: number; col: number }[] = [];
    rows.forEach((row, ri) => {
      columns.forEach((col, ci) => {
        const val = row.cells[col.id];
        if (val && val.toLowerCase().includes(lower)) {
          m.push({ row: ri, col: ci });
        }
      });
    });
    return m;
  }, [findText, rows, columns]);

  const isMatchCell = (ri: number, ci: number) =>
    matches.some((m) => m.row === ri && m.col === ci);

  const isCurrentMatchCell = (ri: number, ci: number) =>
    matches.length > 0 && matches[currentMatch % matches.length]?.row === ri &&
    matches[currentMatch % matches.length]?.col === ci;

  const goToNextMatch = () => {
    if (matches.length === 0) return;
    const next = (currentMatch + 1) % matches.length;
    setCurrentMatch(next);
    focusMatchCell(matches[next]);
  };

  const goToPrevMatch = () => {
    if (matches.length === 0) return;
    const prev = (currentMatch - 1 + matches.length) % matches.length;
    setCurrentMatch(prev);
    focusMatchCell(matches[prev]);
  };

  const focusMatchCell = (m: { row: number; col: number }) => {
    const colId = columns[m.col]?.id;
    const rowId = rows[m.row]?.id;
    if (!colId || !rowId) return;
    const ta = document.querySelector<HTMLTextAreaElement>(
      `[data-row-id="${rowId}"][data-col-id="${colId}"]`
    );
    ta?.focus();
    ta?.select();
    ta?.scrollIntoView({ block: 'center' });
  };

  const replaceCurrent = () => {
    if (matches.length === 0) return;
    const m = matches[currentMatch % matches.length];
    if (!m) return;
    const colId = columns[m.col]?.id;
    const row = rows[m.row];
    if (!colId || !row) return;
    const oldVal = row.cells[colId] || '';
    const lower = findText.toLowerCase();
    const idx = oldVal.toLowerCase().indexOf(lower);
    if (idx === -1) return;
    const newVal = oldVal.slice(0, idx) + replaceText + oldVal.slice(idx + findText.length);
    onRowsChange(rows.map((r) =>
      r.id === row.id ? { ...r, cells: { ...r.cells, [colId]: newVal } } : r
    ));
    goToNextMatch();
  };

  const replaceAll = () => {
    if (!findText) return;
    const lower = findText.toLowerCase();
    const newRows = rows.map((row) => {
      const newCells = { ...row.cells };
      columns.forEach((col) => {
        const val = newCells[col.id];
        if (val) {
          let replaced = val;
          let idx = replaced.toLowerCase().indexOf(lower);
          while (idx !== -1) {
            replaced = replaced.slice(0, idx) + replaceText + replaced.slice(idx + findText.length);
            idx = replaced.toLowerCase().indexOf(lower, idx + replaceText.length);
          }
          if (replaced !== val) newCells[col.id] = replaced;
        }
      });
      return { ...row, cells: newCells };
    });
    onRowsChange(newRows);
  };

  const openFind = () => {
    setShowFind(true);
    setFindText('');
    setReplaceText('');
    setCurrentMatch(0);
    setTimeout(() => findInputRef.current?.focus(), 50);
  };

  const closeFind = () => {
    setShowFind(false);
    setFindText('');
    setCurrentMatch(0);
  };

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+F opens find bar
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (!showFind) {
        openFind();
      } else {
        findInputRef.current?.focus();
        findInputRef.current?.select();
      }
      return;
    }
    // If find bar is open, F3 / Shift+F3 for next/prev
    if (showFind && e.key === 'F3') {
      e.preventDefault();
      if (e.shiftKey) goToPrevMatch();
      else goToNextMatch();
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'c') { copySelection(); e.preventDefault(); }
      if (e.key === 'x') { cutSelection(); e.preventDefault(); }
      if (e.key === 'v') {
        // Native paste into focused textarea handles it via onPaste
        return;
      }
    }
    // Escape clears selection
    if (e.key === 'Escape') {
      setSelection(null);
      selectAnchor.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, columns, rows, showFind, copySelection, cutSelection, goToNextMatch, goToPrevMatch, openFind]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
      {/* ─── Find & Replace bar ──────────────────────────────────────── */}
      {showFind && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/80 text-xs">
          <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
          <input
            ref={findInputRef}
            type="text"
            value={findText}
            onChange={(e) => { setFindText(e.target.value); setCurrentMatch(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) goToPrevMatch();
                else goToNextMatch();
              }
              if (e.key === 'Escape') closeFind();
            }}
            placeholder="Find in sheet..."
            className="w-36 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          <span className="text-zinc-400 dark:text-zinc-500 min-w-[4rem]">
            {matches.length > 0
              ? `${(currentMatch % matches.length) + 1} of ${matches.length}`
              : findText ? 'No results' : ''}
          </span>
          <button onClick={goToPrevMatch} className="p-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 rounded disabled:opacity-30 cursor-pointer" disabled={matches.length === 0} title="Previous (Shift+Enter)">
            <ArrowUp className="h-3 w-3 stroke-[1.5]" />
          </button>
          <button onClick={goToNextMatch} className="p-0.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 rounded disabled:opacity-30 cursor-pointer" disabled={matches.length === 0} title="Next (Enter)">
            <ArrowDown className="h-3 w-3 stroke-[1.5]" />
          </button>
          <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <input
            type="text"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') replaceCurrent(); }}
            placeholder="Replace with..."
            className="w-28 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-200 outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
          <button onClick={replaceCurrent} className="px-2 py-1 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer" disabled={matches.length === 0}>
            Replace
          </button>
          <button onClick={replaceAll} className="px-2 py-1 rounded text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 cursor-pointer" disabled={!findText}>
            All
          </button>
          <button onClick={closeFind} className="ml-auto p-0.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 rounded cursor-pointer" title="Close (Escape)">
            <X className="h-3.5 w-3.5 stroke-[1.5]" />
          </button>
        </div>
      )}
      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
        {/* ─── Header ─────────────────────────────────────────────────── */}
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <th
              className={`w-10 px-1.5 py-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium group/freeze sticky top-0 z-30 bg-zinc-50 dark:bg-zinc-900 ${frozenCols > 0 ? 'left-0 z-40' : ''}`}
            >
              <div className="flex items-center gap-1.5 justify-center">
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selectedRows.size === rows.length}
                  onChange={toggleSelectAll}
                  className="accent-zinc-650 dark:accent-zinc-550 cursor-pointer w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-700 bg-transparent"
                  title={selectedRows.size === rows.length ? 'Deselect all' : 'Select all'}
                />
                <button
                  onClick={toggleFrozen}
                  className={`text-[9px] p-0.5 rounded-full transition-all duration-150 cursor-pointer ${
                    frozenCols > 0 
                      ? 'text-zinc-600 dark:text-zinc-350 bg-zinc-200 dark:bg-zinc-805' 
                      : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400 opacity-0 group-hover/freeze:opacity-100'
                  }`}
                  title={frozenCols > 0 ? "Unfreeze" : "Freeze column"}
                >
                  <Pin className={`h-3 w-3 stroke-[1.5] ${frozenCols > 0 ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-300 dark:text-zinc-600'}`} />
                </button>
              </div>
            </th>
            {columns.map((col, i) => (
              <th
                key={col.id}
                className={`relative border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 px-3 py-2.5 group select-none text-center sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900 ${col.printHidden ? 'opacity-40' : ''} ${
                  frozenCols > 0 && i < frozenCols ? 'left-[40px] z-30' : ''
                }`}
                style={{
                  width: colWidths[col.id] || undefined,
                  minWidth: 150,
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
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50"
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
                    className="w-full rounded border border-zinc-300 dark:border-zinc-750 bg-white dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none text-center"
                  />
                ) : (
                  <div className="flex items-center justify-center gap-1 min-h-[28px] pr-6 pl-4">
                    <GripVertical className="h-3.5 w-3.5 stroke-[1.2] text-zinc-300 dark:text-zinc-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span 
                      onClick={() => {
                        startEditCol(col);
                        selectColumnCells(col.id);
                      }}
                      className="cursor-pointer text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 truncate select-none"
                      title="Click to rename"
                    >
                      {col.label}
                    </span>
                  </div>
                )}

                {/* 3-dots button (More Options) */}
                {!editingCol && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenColMenu(openColMenu === col.id ? null : col.id);
                    }}
                    className={`absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-all cursor-pointer ${
                      openColMenu === col.id ? 'opacity-100 bg-zinc-200/60 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    title="Column options"
                  >
                    <MoreVertical className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                )}

                {/* Dropdown Menu */}
                {openColMenu === col.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-1.5 top-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl py-1.5 z-50 text-left min-w-[160px] text-xs font-normal text-zinc-700 dark:text-zinc-300 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setOpenColMenu(null);
                        startEditCol(col);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Rename Column</span>
                    </button>
                    
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1.5" />
                    
                    <div className="px-3 py-1 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Column Type
                    </div>
                    <button
                      onClick={() => {
                        setOpenColMenu(null);
                        onColumnsChange(columns.map((c) => c.id === col.id ? { ...c, type: undefined } : c));
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>Text</span>
                      {col.type !== 'number' && <Check className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />}
                    </button>
                    <button
                      onClick={() => {
                        setOpenColMenu(null);
                        onColumnsChange(columns.map((c) => c.id === col.id ? { ...c, type: 'number' } : c));
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>Number</span>
                      {col.type === 'number' && <Check className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />}
                    </button>
                    
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1.5" />
                    
                    <div className="px-3 py-1 text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      Print Settings
                    </div>
                    <button
                      onClick={() => {
                        setOpenColMenu(null);
                        onColumnsChange(columns.map((c) => c.id === col.id ? { ...c, printHidden: false } : c));
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>Show in Print</span>
                      {!col.printHidden && <Check className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />}
                    </button>
                    <button
                      onClick={() => {
                        setOpenColMenu(null);
                        onColumnsChange(columns.map((c) => c.id === col.id ? { ...c, printHidden: true } : c));
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>Hide from Print</span>
                      {col.printHidden && <Check className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 stroke-[1.5]" />}
                    </button>
                    
                    {columns.length > 1 && (
                      <>
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1.5" />
                        <button
                          onClick={() => {
                            setOpenColMenu(null);
                            deleteColumn(col.id);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span>Delete Column</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </th>
            ))}
            {/* Add column button */}
            <th className="w-10 px-1 py-2 sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={addColumn}
                className="flex h-6 w-6 items-center justify-center rounded text-zinc-300 dark:text-zinc-650 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
                title="Add column"
              >
                <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 group"
              style={{ height: rowHeights[row.id] || undefined }}
              draggable
              onDragStart={() => handleRowDragStart(i)}
              onDragOver={(e) => handleRowDragOver(e, i)}
              onDragEnd={handleRowDragEnd}
            >
              <td
                className={`relative px-1 py-2 text-xs text-zinc-400 dark:text-zinc-500 align-middle cursor-grab ${
                  frozenCols > 0 ? 'sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50/50 dark:group-hover:bg-zinc-800/30' : ''
                } ${
                  openRowMenu === row.id ? 'z-30' : 'z-10'
                }`}
                style={{ width: 40 }}
              >
                {/* Row number: visible by default, hidden on hover if menu is not open */}
                <span className={`select-none transition-opacity duration-150 ${
                  openRowMenu === row.id ? 'opacity-0' : 'group-hover:opacity-0'
                }`}>
                  {i + 1}
                </span>

                {/* 3-dots button: visible on hover or when menu is open */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
                  openRowMenu === row.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenRowMenu(openRowMenu === row.id ? null : row.id);
                    }}
                    className={`h-6 w-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300 cursor-pointer ${
                      openRowMenu === row.id ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' : ''
                    }`}
                    title="Row options"
                  >
                    <MoreVertical className="h-3.5 w-3.5 stroke-[1.5]" />
                  </button>
                </div>

                {/* Row Context Menu */}
                {openRowMenu === row.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-[36px] top-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl py-1.5 z-40 text-left min-w-[140px] text-xs font-normal text-zinc-700 dark:text-zinc-300 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpenRowMenu(null);
                        insertRowAbove(i);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-905 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Insert Row Above</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenRowMenu(null);
                        insertRowBelow(i);
                      }}
                      className="w-full px-3 py-1.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-905 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Insert Row Below</span>
                    </button>
                    {rows.length > 1 && (
                      <>
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setOpenRowMenu(null);
                            deleteRow(row.id);
                          }}
                          className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-450 flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <span>Delete Row</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </td>
              {columns.map((col, ci) => {
                const sel = isSelected(i, ci);
                const numeric = col.type === 'number';
                return (
                <td
                  key={col.id}
                  className={`border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 px-2 py-1 align-middle ${col.printHidden ? 'print:hidden opacity-30' : ''} ${
                    sel ? 'bg-zinc-100 dark:bg-zinc-800' : isCurrentMatchCell(i, ci) ? 'bg-amber-200 dark:bg-amber-900/50' : isMatchCell(i, ci) ? 'bg-amber-50 dark:bg-amber-950/20' : ''
                  } ${
                    frozenCols > 0 && ci < frozenCols ? `sticky z-10 ${sel ? 'bg-zinc-100 dark:bg-zinc-800' : isCurrentMatchCell(i, ci) ? 'bg-amber-200 dark:bg-amber-900/50' : isMatchCell(i, ci) ? 'bg-amber-50 dark:bg-amber-950/20' : 'bg-white dark:bg-zinc-900 group-hover:bg-zinc-50/50 dark:group-hover:bg-zinc-800/30'}` : ''
                  }`}
                  style={{
                    width: colWidths[col.id] || undefined,
                    left: frozenCols > 0 && ci < frozenCols
                      ? (ci === 0 ? '40px' : `${40 + (colWidths[columns[0]?.id] || 160)}px`)
                      : undefined,
                  }}
                  onMouseDown={(e) => handleCellMouseDown(i, ci, e)}
                  onMouseEnter={() => handleCellMouseEnter(i, ci)}
                >
                  <textarea
                    value={row.cells[col.id] || ""}
                    onChange={(e) => {
                      updateCell(row.id, col.id, e.target.value);
                      autoResize(e.target);
                    }}
                    onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
                    onKeyDown={(e) => {
                      const ta = e.target as HTMLTextAreaElement;
                      const cursorAtStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
                      const cursorAtEnd = ta.selectionStart === ta.value.length;
                      const rowIndex = rows.findIndex((r) => r.id === row.id);
                      const colIndex = columns.findIndex((c) => c.id === col.id);
                      if (e.key === 'ArrowUp' && cursorAtStart && rowIndex > 0) {
                        e.preventDefault();
                        const prevId = rows[rowIndex - 1].id;
                        const prev = document.querySelector<HTMLTextAreaElement>(`[data-row-id="${prevId}"][data-col-id="${col.id}"]`);
                        prev?.focus();
                        prev?.setSelectionRange(prev.value.length, prev.value.length);
                      }
                      if (e.key === 'ArrowDown' && cursorAtEnd && rowIndex < rows.length - 1) {
                        e.preventDefault();
                        const nextId = rows[rowIndex + 1].id;
                        const next = document.querySelector<HTMLTextAreaElement>(`[data-row-id="${nextId}"][data-col-id="${col.id}"]`);
                        next?.focus();
                        next?.setSelectionRange(0, 0);
                      }
                      if (e.key === 'ArrowLeft' && cursorAtStart && colIndex > 0) {
                        e.preventDefault();
                        const prevCol = columns[colIndex - 1];
                        const prev = document.querySelector<HTMLTextAreaElement>(`[data-row-id="${row.id}"][data-col-id="${prevCol.id}"]`);
                        prev?.focus();
                        prev?.setSelectionRange(prev.value.length, prev.value.length);
                      }
                      if (e.key === 'ArrowRight' && cursorAtEnd && colIndex < columns.length - 1) {
                        e.preventDefault();
                        const nextCol = columns[colIndex + 1];
                        const next = document.querySelector<HTMLTextAreaElement>(`[data-row-id="${row.id}"][data-col-id="${nextCol.id}"]`);
                        next?.focus();
                        next?.setSelectionRange(0, 0);
                      }
                    }}
                    onPaste={(e) => handlePaste(e, row.id, col.id)}
                    data-row-id={row.id}
                    data-col-id={col.id}
                    rows={1}
                    className={`w-full resize-none border-0 bg-transparent px-1 py-1.5 text-sm outline-none focus:ring-0 placeholder-zinc-300 dark:placeholder-zinc-700 overflow-hidden break-words whitespace-pre-wrap align-middle ${numeric ? 'text-right text-zinc-700 dark:text-zinc-200' : 'text-zinc-700 dark:text-zinc-200'}`}
                    placeholder="—"
                  />
                </td>
                );
              })}
              {/* Row resize handle cell aligned with "Add column" header */}
              <td 
                className="w-10 px-1 py-1 align-middle relative group-hover:bg-zinc-50/50 dark:group-hover:bg-zinc-800/30"
                style={{ width: 40 }}
              >
                <div
                  onMouseDown={(e) => handleRowResizeStart(row.id, e)}
                  onDoubleClick={() => {
                    setRowHeights((prev) => {
                      const next = { ...prev };
                      delete next[row.id];
                      return next;
                    });
                  }}
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-row-resize z-20 hover:bg-zinc-300/30 dark:hover:bg-zinc-750/30 transition-colors"
                  style={{ transform: 'translateY(50%)' }}
                  title="Drag to resize row · Double-click to auto-fit"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bottom toolbar */}
      <div className="flex items-center px-2 py-2 border-t border-zinc-105 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-3">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-350 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 stroke-[1.5]" />
          Add Row
        </button>
        {selectedRows.size > 0 && (
          <button
            onClick={deleteSelectedRows}
            className="inline-flex items-center gap-1 text-xs font-medium text-red-400 dark:text-red-500 hover:text-red-650 dark:hover:text-red-400 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5 stroke-[1.5]" />
            Delete {selectedRows.size} row{selectedRows.size > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
}

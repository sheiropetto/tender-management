import * as XLSX from "xlsx";

export interface ParsedData {
  columns: string[];
  rows: Record<string, string>[];
  sheetName: string;
}

/**
 * Parse an uploaded Excel/CSV file using SheetJS.
 */
export function parseExcelFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert to array of arrays first
        const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(
          sheet,
          { defval: "", header: 1 }
        ) as unknown as string[][];

        if (jsonData.length === 0) {
          reject(new Error("The file is empty."));
          return;
        }

        // First row = column headers, rest = data
        const headers = jsonData[0].map((h) => h?.toString().trim() || `Column ${jsonData[0].indexOf(h) + 1}`);
        const rows = jsonData.slice(1).map((row) => {
          const rowObj: Record<string, string> = {};
          headers.forEach((header, i) => {
            rowObj[header] = row[i]?.toString().trim() ?? "";
          });
          return rowObj;
        });

        resolve({
          columns: headers,
          rows: rows.filter((r) => Object.values(r).some((v) => v !== "")),
          sheetName,
        });
      } catch (err) {
        reject(new Error("Failed to parse file. Make sure it's a valid .xlsx or .csv file."));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsBinaryString(file);
  });
}

/**
 * Parse tab-separated or comma-separated text pasted from clipboard.
 */
export function parsePastedData(text: string): ParsedData {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    throw new Error("No data found. Please paste at least a header row.");
  }

  // Detect delimiter: tab or comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  const headers = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  const rows = lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((v) =>
      v.trim().replace(/^"|"$/g, "")
    );
    const rowObj: Record<string, string> = {};
    headers.forEach((header, i) => {
      rowObj[header] = values[i] ?? "";
    });
    return rowObj;
  });

  return {
    columns: headers,
    rows: rows.filter((r) => Object.values(r).some((v) => v !== "")),
    sheetName: "Pasted Data",
  };
}

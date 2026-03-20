/**
 * Client-side CSV export for panel tables.
 * Escapes quotes and wraps fields containing commas.
 */

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsvRow(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",");
}

export function downloadCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string) {
  const headerRow = buildCsvRow(headers);
  const dataRows = rows.map((row) => buildCsvRow(row));
  const csv = [headerRow, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

import { NextResponse } from "next/server";

function escape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Turn an array of flat objects into a CSV string using the given columns. */
export function toCsv(
  rows: Record<string, unknown>[],
  columns: { key: string; header: string }[]
): string {
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows
    .map((r) => columns.map((c) => escape(r[c.key])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

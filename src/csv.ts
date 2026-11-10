import { DayRecord } from "./store";

function field(value: string | number): string {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Eén rij per dag: datum, totaal en een kolom per map. Met BOM, zodat Excel de tekens goed leest.
export function buildCsv(days: Record<string, DayRecord>): string {
  const folders = [...new Set(Object.values(days).flatMap((d) => Object.keys(d.folders)))].sort();
  const lines = [["datum", "totaal", ...folders].map(field).join(",")];
  for (const key of Object.keys(days).sort()) {
    const d = days[key];
    lines.push([key, d.total, ...folders.map((f) => d.folders[f] ?? 0)].map(field).join(","));
  }
  return "﻿" + lines.join("\n") + "\n";
}

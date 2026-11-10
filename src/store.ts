export interface DayRecord {
  total: number;
  folders: Record<string, number>;
}

export const SAVE_DELAY_MS = 5000;

// Geschreven woorden per dag per map. `total` staat los van de mappen, zodat een bestand in
// twee geneste mappen in het dagtotaal maar één keer telt.
export class Store {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;

  constructor(
    readonly days: Record<string, DayRecord>,
    private save: () => unknown,
    private delayMs = SAVE_DELAY_MS,
  ) {}

  day(key: string): DayRecord {
    return this.days[key] ?? { total: 0, folders: {} };
  }

  add(key: string, folders: string[], n: number) {
    const rec = (this.days[key] ??= { total: 0, folders: {} });
    rec.total += n;
    for (const f of folders) rec.folders[f] = (rec.folders[f] ?? 0) + n;
    this.markDirty();
  }

  remove(key: string, folders: string[], n: number) {
    const rec = this.days[key];
    if (!rec) return;
    rec.total = Math.max(0, rec.total - n);
    for (const f of folders) {
      const left = Math.max(0, (rec.folders[f] ?? 0) - n);
      if (left > 0) rec.folders[f] = left;
      else delete rec.folders[f];
    }
    if (rec.total === 0 && Object.keys(rec.folders).length === 0) delete this.days[key];
    this.markDirty();
  }

  // Totaal ooit geschreven.
  totalEver(): number {
    return Object.values(this.days).reduce((sum, d) => sum + d.total, 0);
  }

  folderTotalEver(folder: string): number {
    return Object.values(this.days).reduce((sum, d) => sum + (d.folders[folder] ?? 0), 0);
  }

  clear() {
    for (const key of Object.keys(this.days)) delete this.days[key];
    this.markDirty();
    this.flush();
  }

  // Direct wegschrijven (bij afsluiten); doet niets als er niets te bewaren is.
  flush() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty) return;
    this.dirty = false;
    this.save();
  }

  // Gebufferd: hooguit één keer per `delayMs`, zodat typen vlot blijft.
  private markDirty() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.delayMs);
  }
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

// Leest `days` uit data.json en slaat onbruikbare stukken over.
export function parseDays(raw: unknown): Record<string, DayRecord> {
  const days: Record<string, DayRecord> = {};
  if (typeof raw !== "object" || raw === null) return days;
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof value !== "object" || value === null) continue;
    const { total, folders } = value as Partial<DayRecord>;
    if (!isCount(total)) continue;
    const clean: Record<string, number> = {};
    if (typeof folders === "object" && folders !== null) {
      for (const [f, n] of Object.entries(folders)) if (isCount(n)) clean[f] = n;
    }
    days[key] = { total, folders: clean };
  }
  return days;
}

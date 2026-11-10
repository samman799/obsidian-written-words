import { DayRecord } from "./store";

// Alle datums zijn dagsleutels (YYYY-MM-DD), die ook alfabetisch op volgorde staan.
const pad = (n: number) => String(n).padStart(2, "0");

function parse(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12); // middag, zodat zomer-/wintertijd niets verschuift
}

function format(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key: string, n: number): string {
  const d = parse(key);
  d.setDate(d.getDate() + n);
  return format(d);
}

// De maandag van de week waar deze dag in valt.
export function weekStart(key: string): string {
  const day = parse(key).getDay(); // 0 = zondag
  return addDays(key, -((day + 6) % 7));
}

export function monthStart(key: string): string {
  return key.slice(0, 8) + "01";
}

// Geschreven woorden van `from` tot en met `to`; met `folder` alleen die map.
export function sumRange(
  days: Record<string, DayRecord>,
  from: string,
  to: string,
  folder?: string,
): number {
  let sum = 0;
  for (const [key, rec] of Object.entries(days)) {
    if (key < from || key > to) continue;
    sum += folder === undefined ? rec.total : (rec.folders[folder] ?? 0);
  }
  return sum;
}

// Het aantal dagen op rij dat het doel is gehaald. Is het doel vandaag nog niet gehaald, dan telt
// vandaag niet mee en breekt het ook niet: de dag is nog bezig.
export function streak(days: Record<string, DayRecord>, today: string, goal: number): number {
  const reached = (key: string) => (days[key]?.total ?? 0) >= goal;
  let key = reached(today) ? today : addDays(today, -1);
  let count = 0;
  while (reached(key)) {
    count++;
    key = addDays(key, -1);
  }
  return count;
}

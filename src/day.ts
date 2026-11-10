const pad = (n: number) => String(n).padStart(2, "0");

// De dag waar een tijdstip bij hoort, als YYYY-MM-DD in lokale tijd. De dag begint pas om
// `startHour`: met 2 hoort 01:59 nog bij gisteren.
export function dayKey(ms: number, startHour: number): string {
  const d = new Date(ms);
  if (d.getHours() < startHour) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

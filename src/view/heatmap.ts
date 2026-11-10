import { addDays, weekStart } from "../stats";
import { DayRecord } from "../store";

export const WEEKS = 52;

export interface HeatCell {
  key: string;
  total: number;
  // 0 = niets geschreven; 1-3 = steeds dichter bij het doel; 4 = doel gehaald.
  level: 0 | 1 | 2 | 3 | 4;
}

export function levelFor(total: number, goal: number): HeatCell["level"] {
  if (total <= 0) return 0;
  if (total >= goal) return 4;
  const f = total / goal;
  return f <= 1 / 3 ? 1 : f <= 2 / 3 ? 2 : 3;
}

// De afgelopen 52 weken, per week een kolom van maandag tot zondag. Dagen na vandaag ontbreken.
export function heatmapColumns(
  days: Record<string, DayRecord>,
  today: string,
  goal: number,
): HeatCell[][] {
  const first = addDays(weekStart(today), -7 * (WEEKS - 1));
  const columns: HeatCell[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(first, w * 7 + d);
      if (key > today) break;
      const total = days[key]?.total ?? 0;
      column.push({ key, total, level: levelFor(total, goal) });
    }
    columns.push(column);
  }
  return columns;
}

const SVG = "http://www.w3.org/2000/svg";
const CELL = 11;
const GAP = 3;
const LEFT = 22;
const TOP = 16;

const monthFormat = new Intl.DateTimeFormat("nl-NL", { month: "short" });
const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
const numberFormat = new Intl.NumberFormat("nl-NL");

function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

// Tekent de heatmap met gewone SVG. Kleuren komen uit het thema via CSS (zie styles.css).
export function drawHeatmap(columns: HeatCell[][], today: string): SVGSVGElement {
  const width = LEFT + columns.length * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);
  const svg = el("svg", { class: "ww-heatmap", width, height, viewBox: `0 0 ${width} ${height}` });

  ["ma", "wo", "vr"].forEach((label, i) => {
    const t = el("text", { class: "ww-heat-label", x: 0, y: TOP + i * 2 * (CELL + GAP) + CELL - 2 });
    t.textContent = label;
    svg.appendChild(t);
  });

  let lastMonth = -1;
  columns.forEach((column, x) => {
    if (column.length === 0) return;
    const month = parseKey(column[0].key).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const t = el("text", { class: "ww-heat-label", x: LEFT + x * (CELL + GAP), y: 10 });
      t.textContent = monthFormat.format(parseKey(column[0].key));
      svg.appendChild(t);
    }
    column.forEach((cell, y) => {
      const rect = el("rect", {
        class: `ww-heat-cell ww-heat-${cell.level}${cell.key === today ? " is-today" : ""}`,
        x: LEFT + x * (CELL + GAP),
        y: TOP + y * (CELL + GAP),
        width: CELL,
        height: CELL,
        rx: 2,
      });
      const title = el("title", {});
      title.textContent = `${dateFormat.format(parseKey(cell.key))}: ${numberFormat.format(cell.total)} woorden`;
      rect.appendChild(title);
      svg.appendChild(rect);
    });
  });

  return svg;
}

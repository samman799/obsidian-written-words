import { describe, expect, it } from "vitest";
import { heatmapColumns, levelFor, WEEKS } from "../src/view/heatmap";

describe("levelFor", () => {
  it("0 zonder woorden, 4 bij het doel", () => {
    expect(levelFor(0, 500)).toBe(0);
    expect(levelFor(500, 500)).toBe(4);
    expect(levelFor(900, 500)).toBe(4);
  });

  it("trappen tussen 0 en het doel", () => {
    expect(levelFor(1, 500)).toBe(1);
    expect(levelFor(160, 500)).toBe(1);
    expect(levelFor(250, 500)).toBe(2);
    expect(levelFor(400, 500)).toBe(3);
    expect(levelFor(499, 500)).toBe(3);
  });
});

describe("heatmapColumns", () => {
  const today = "2026-10-28"; // woensdag
  const cols = heatmapColumns({ "2026-10-27": { total: 600, folders: {} } }, today, 500);

  it("52 weekkolommen, de laatste loopt tot en met vandaag", () => {
    expect(cols).toHaveLength(WEEKS);
    const last = cols[WEEKS - 1];
    expect(last.map((c) => c.key)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28"]);
  });

  it("elke volle week is maandag tot en met zondag", () => {
    expect(cols[0]).toHaveLength(7);
    expect(cols[0][0].key).toBe("2025-11-03");
    expect(cols[0][6].key).toBe("2025-11-09");
  });

  it("neemt de woorden en het niveau per dag over", () => {
    const cell = cols[WEEKS - 1][1];
    expect(cell).toEqual({ key: "2026-10-27", total: 600, level: 4 });
    expect(cols[WEEKS - 1][2].level).toBe(0);
  });
});

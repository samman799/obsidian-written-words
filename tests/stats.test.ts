import { describe, expect, it } from "vitest";
import { addDays, monthStart, streak, sumRange, weekStart } from "../src/stats";
import { DayRecord } from "../src/store";

const day = (total: number, folders: Record<string, number> = {}): DayRecord => ({ total, folders });

describe("datums", () => {
  it("addDays rolt over maand- en jaargrenzen", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("addDays gaat goed door de wintertijd", () => {
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26");
    expect(addDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("de week begint op maandag", () => {
    expect(weekStart("2026-10-28")).toBe("2026-10-26"); // woensdag
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // maandag
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // zondag
  });

  it("monthStart", () => {
    expect(monthStart("2026-10-28")).toBe("2026-10-01");
  });
});

describe("sumRange", () => {
  const days = {
    "2026-10-25": day(10, { A: 10 }),
    "2026-10-26": day(20, { A: 5, B: 15 }),
    "2026-10-28": day(30, { A: 30 }),
  };

  it("telt dagen binnen het bereik, grenzen inbegrepen", () => {
    expect(sumRange(days, "2026-10-26", "2026-10-28")).toBe(50);
  });

  it("telt per map", () => {
    expect(sumRange(days, "2026-10-01", "2026-10-31", "A")).toBe(45);
    expect(sumRange(days, "2026-10-01", "2026-10-31", "B")).toBe(15);
    expect(sumRange(days, "2026-10-01", "2026-10-31", "C")).toBe(0);
  });
});

describe("streak", () => {
  it("telt dagen op rij met het doel gehaald", () => {
    const days = { "2026-10-26": day(500), "2026-10-27": day(600), "2026-10-28": day(500) };
    expect(streak(days, "2026-10-28", 500)).toBe(3);
  });

  it("vandaag nog niet gehaald breekt de streak niet", () => {
    const days = { "2026-10-26": day(500), "2026-10-27": day(600), "2026-10-28": day(100) };
    expect(streak(days, "2026-10-28", 500)).toBe(2);
  });

  it("een gemiste dag breekt de streak", () => {
    const days = { "2026-10-25": day(500), "2026-10-27": day(500), "2026-10-28": day(500) };
    expect(streak(days, "2026-10-28", 500)).toBe(2);
  });

  it("0 zonder gehaalde dagen", () => {
    expect(streak({}, "2026-10-28", 500)).toBe(0);
    expect(streak({ "2026-10-27": day(499) }, "2026-10-28", 500)).toBe(0);
  });
});

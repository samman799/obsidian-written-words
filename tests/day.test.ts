import { describe, expect, it } from "vitest";
import { dayKey } from "../src/day";

const at = (h: number, m = 0, d = 28) => new Date(2026, 9, d, h, m).getTime();

describe("dayKey", () => {
  it("hoort voor het beginuur nog bij de vorige dag", () => {
    expect(dayKey(at(1, 59), 2)).toBe("2026-10-27");
    expect(dayKey(at(0, 0), 2)).toBe("2026-10-27");
  });

  it("begint op het beginuur", () => {
    expect(dayKey(at(2, 0), 2)).toBe("2026-10-28");
    expect(dayKey(at(23, 59), 2)).toBe("2026-10-28");
  });

  it("werkt met een ander beginuur", () => {
    expect(dayKey(at(3, 59), 4)).toBe("2026-10-27");
    expect(dayKey(at(4, 0), 4)).toBe("2026-10-28");
  });

  it("beginuur 0 is een gewone kalenderdag", () => {
    expect(dayKey(at(0, 0), 0)).toBe("2026-10-28");
  });

  it("rolt over een maandgrens", () => {
    expect(dayKey(new Date(2026, 10, 1, 1, 0).getTime(), 2)).toBe("2026-10-31");
  });
});

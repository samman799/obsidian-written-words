import { describe, expect, it } from "vitest";
import { buildCsv } from "../src/csv";

describe("buildCsv", () => {
  it("één rij per dag met een kolom per map, op datum", () => {
    const csv = buildCsv({
      "2026-10-28": { total: 612, folders: { "Schrijven/Roman": 400, Blog: 212 } },
      "2026-10-27": { total: 100, folders: { Blog: 100 } },
    });
    expect(csv).toBe(
      "﻿datum,totaal,Blog,Schrijven/Roman\n2026-10-27,100,100,0\n2026-10-28,612,212,400\n",
    );
  });

  it("zet velden met komma's of aanhalingstekens tussen aanhalingstekens", () => {
    const csv = buildCsv({ "2026-10-28": { total: 1, folders: { 'Map, "gek"': 1 } } });
    expect(csv).toContain('"Map, ""gek"""');
  });

  it("alleen een kopregel zonder gegevens", () => {
    expect(buildCsv({})).toBe("﻿datum,totaal\n");
  });
});

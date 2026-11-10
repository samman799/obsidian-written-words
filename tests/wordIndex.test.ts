import { describe, expect, it } from "vitest";
import { WordIndex } from "../src/wordIndex";

describe("WordIndex", () => {
  it("telt woorden per map en overall", () => {
    const idx = new WordIndex(["Roman", "Blog"]);
    idx.set("Roman/h1.md", 100);
    idx.set("Roman/h2.md", 50);
    idx.set("Blog/a.md", 10);
    expect(idx.folderTotal("Roman")).toBe(150);
    expect(idx.folderTotal("Blog")).toBe(10);
    expect(idx.total()).toBe(160);
  });

  it("negeert bestanden buiten de gekozen mappen", () => {
    const idx = new WordIndex(["Roman"]);
    idx.set("Dagboek/a.md", 99);
    expect(idx.total()).toBe(0);
    expect(idx.size).toBe(0);
  });

  it("geneste mappen: beide mappen tellen mee, het totaal één keer", () => {
    const idx = new WordIndex(["Schrijven", "Schrijven/Roman"]);
    idx.set("Schrijven/Roman/h1.md", 100);
    idx.set("Schrijven/notitie.md", 20);
    expect(idx.folderTotal("Schrijven")).toBe(120);
    expect(idx.folderTotal("Schrijven/Roman")).toBe(100);
    expect(idx.total()).toBe(120);
  });

  it("een bijgewerkt bestand past het totaal aan, geen dubbeltelling", () => {
    const idx = new WordIndex(["Roman"]);
    idx.set("Roman/h1.md", 100);
    idx.set("Roman/h1.md", 130);
    expect(idx.total()).toBe(130);
    idx.set("Roman/h1.md", 40);
    expect(idx.folderTotal("Roman")).toBe(40);
  });

  it("verwijderen haalt het bestand uit alle totalen", () => {
    const idx = new WordIndex(["Schrijven", "Schrijven/Roman"]);
    idx.set("Schrijven/Roman/h1.md", 100);
    idx.remove("Schrijven/Roman/h1.md");
    expect(idx.folderTotal("Schrijven")).toBe(0);
    expect(idx.folderTotal("Schrijven/Roman")).toBe(0);
    expect(idx.total()).toBe(0);
    idx.remove("bestaat/niet.md"); // geen fout
  });

  it("bestand verplaatsen naar een andere map past de totalen aan", () => {
    const idx = new WordIndex(["Roman", "Blog"]);
    idx.set("Roman/a.md", 100);
    idx.remove("Roman/a.md");
    idx.set("Blog/a.md", 100);
    expect(idx.folderTotal("Roman")).toBe(0);
    expect(idx.folderTotal("Blog")).toBe(100);
    expect(idx.total()).toBe(100);
  });

  it("bestand verplaatsen uit alle mappen haalt het weg", () => {
    const idx = new WordIndex(["Roman"]);
    idx.set("Roman/a.md", 100);
    idx.set("Roman/a.md", 100);
    idx.remove("Roman/a.md");
    idx.set("Elders/a.md", 100);
    expect(idx.total()).toBe(0);
  });

  it("reset begint opnieuw met nieuwe mappen", () => {
    const idx = new WordIndex(["Roman"]);
    idx.set("Roman/a.md", 100);
    idx.reset(["Blog"]);
    expect(idx.total()).toBe(0);
    idx.set("Blog/b.md", 5);
    expect(idx.total()).toBe(5);
  });
});

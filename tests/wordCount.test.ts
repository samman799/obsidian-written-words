import { describe, expect, it } from "vitest";
import { countWords, stripFrontmatter } from "../src/wordCount";

describe("countWords", () => {
  it("telt gewone woorden", () => {
    expect(countWords("Dit is een zin.")).toBe(4);
  });

  it("geeft 0 voor leeg of alleen witruimte en leestekens", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("  \n\t ")).toBe(0);
    expect(countWords("... ,;! —")).toBe(0);
  });

  it("telt een woord met apostrof als één woord", () => {
    expect(countWords("zo'n")).toBe(1);
    expect(countWords("auto's")).toBe(1);
    expect(countWords("auto’s")).toBe(1);
  });

  it("telt een woord met koppelteken als één woord", () => {
    expect(countWords("zelf-standig")).toBe(1);
  });

  it("telt een los koppelteken of apostrof niet mee", () => {
    expect(countWords("a - b")).toBe(2);
    expect(countWords("hallo -")).toBe(1);
    expect(countWords("'hallo'")).toBe(1);
  });

  it("negeert markdown-tekens", () => {
    expect(countWords("# Kop")).toBe(1);
    expect(countWords("**vet** en *schuin*")).toBe(3);
    expect(countWords("> citaat hier")).toBe(2);
    expect(countWords("- [ ] taak")).toBe(1);
    expect(countWords("[[Link|alias]]")).toBe(2);
  });

  it("telt cijfers als woorden", () => {
    expect(countWords("in 2026 waren er 3 boeken")).toBe(6);
  });

  it("werkt met Unicode-letters", () => {
    expect(countWords("café naïef straße")).toBe(3);
    expect(countWords("日本語 テキスト")).toBe(2);
    expect(countWords("Привет мир")).toBe(2);
  });

  it("telt over meerdere regels", () => {
    expect(countWords("een\ntwee\r\ndrie")).toBe(3);
  });
});

describe("stripFrontmatter", () => {
  it("haalt het frontmatter-blok weg", () => {
    const tekst = "---\ntitle: Test\ntags: [a, b]\n---\nEcht begin";
    expect(stripFrontmatter(tekst)).toBe("Echt begin");
    expect(countWords(stripFrontmatter(tekst))).toBe(2);
  });

  it("werkt met CRLF", () => {
    expect(stripFrontmatter("---\r\na: b\r\n---\r\ntekst")).toBe("tekst");
  });

  it("laat tekst zonder frontmatter ongemoeid", () => {
    expect(stripFrontmatter("Gewone tekst")).toBe("Gewone tekst");
  });

  it("negeert --- die niet bovenaan staat", () => {
    const tekst = "Eerst tekst\n---\nmeer\n---\n";
    expect(stripFrontmatter(tekst)).toBe(tekst);
  });

  it("laat een niet-gesloten blok staan", () => {
    const tekst = "---\ntitle: x\nnooit gesloten";
    expect(stripFrontmatter(tekst)).toBe(tekst);
  });
});

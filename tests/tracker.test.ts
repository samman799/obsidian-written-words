import { EditorState, Transaction } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { WordCounter } from "../src/counter";
import { EditorTracker } from "../src/editorTracker";
import { frontmatterEnd } from "../src/delta";
import { matchFolders } from "../src/folders";
import { Store } from "../src/store";

// Een kleine "editor": een EditorState, een tracker en een klok.
class Sim {
  state: EditorState;
  // Een woensdagmiddag, ver van de dagwissel van 02:00.
  now = new Date(2026, 9, 28, 12, 0, 0).getTime();
  store = new Store({}, () => {});
  counter = new WordCounter(this.store, () => 2, () => this.now);
  tracker: EditorTracker;

  constructor(
    doc = "",
    path = "Schrijven/Roman/h1.md",
    folders = ["Schrijven"],
    windowSeconds = 20,
  ) {
    this.state = EditorState.create({ doc });
    this.tracker = new EditorTracker(this.counter, () => ({
      folders,
      correctionWindowMs: windowSeconds * 1000,
    }));
    this.tracker.setPath(path);
  }

  get doc() {
    return this.state.doc.toString();
  }

  change(from: number, to: number, insert: string, userEvent?: string) {
    const tr = this.state.update({ changes: { from, to, insert }, userEvent });
    this.state = tr.state;
    this.tracker.handle(tr, this.now);
  }

  // Typt tekst teken voor teken aan het eind van het document.
  type(text: string) {
    for (const ch of text) this.change(this.state.doc.length, this.state.doc.length, ch, "input.type");
  }

  typeAt(pos: number, text: string) {
    for (const ch of text) this.change(pos++, pos - 1, ch, "input.type");
  }

  // Wist de laatste `n` tekens, teken voor teken (backspace).
  backspace(n: number) {
    for (let i = 0; i < n; i++) {
      const end = this.state.doc.length;
      this.change(end - 1, end, "", "delete.backward");
    }
  }

  deleteRange(from: number, to: number, userEvent = "delete.selection") {
    this.change(from, to, "", userEvent);
  }

  wait(seconds: number) {
    this.now += seconds * 1000;
  }

  get total() {
    return this.counter.today().total;
  }
}

const words = (n: number, prefix = "woord") =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(" ") + " ";

describe("testscenario's uit het plan", () => {
  it("300 typen, na meer dan 20 s 200 wissen, 300 typen = 600", () => {
    const s = new Sim();
    s.type(words(300, "aa"));
    expect(s.total).toBe(300);
    s.wait(21);
    const text = s.doc;
    // wis de laatste 200 woorden in één keer
    const cut = text.split(" ").slice(0, 100).join(" ").length;
    s.deleteRange(cut + 1, text.length);
    expect(s.total).toBe(300);
    s.type(words(300, "bb"));
    expect(s.total).toBe(600);
  });

  it("3 woorden typen, binnen 20 s wissen, 3 andere typen = 3", () => {
    const s = new Sim();
    s.type("een twee drie ");
    expect(s.total).toBe(3);
    s.wait(5);
    s.deleteRange(0, s.doc.length);
    expect(s.total).toBe(0);
    s.type("vier vijf zes ");
    expect(s.total).toBe(3);
  });

  it("3 woorden typen, na 30 s wissen = 3", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.wait(30);
    s.deleteRange(0, s.doc.length);
    expect(s.total).toBe(3);
  });

  it("een woord beginnen en direct wissen = 0", () => {
    const s = new Sim();
    s.type("hal");
    s.backspace(3);
    expect(s.total).toBe(0);
    expect(s.counter.pending).toBe(0);
  });

  it("nieuwe woorden typen en binnen 20 s oude tekst elders wissen: nieuwe blijven", () => {
    const s = new Sim("oude tekst die weg mag. ");
    s.type("nieuw een twee ");
    expect(s.total).toBe(3);
    s.wait(5);
    s.deleteRange(0, 24);
    expect(s.total).toBe(3);
    expect(s.counter.pending).toBe(3);
  });

  it("plakken = 0", () => {
    const s = new Sim();
    s.change(0, 0, words(500), "input.paste");
    expect(s.total).toBe(0);
    s.change(0, 0, "nog een stuk", "input.drop");
    expect(s.total).toBe(0);
  });

  it("tikfout verbeteren = 0", () => {
    const s = new Sim("hallp wereld");
    s.typeAt(4, "o");
    s.deleteRange(5, 6);
    expect(s.doc).toBe("hallo wereld");
    expect(s.total).toBe(0);
  });

  it("template (zonder label) = 0", () => {
    const s = new Sim();
    s.change(0, 0, words(50));
    expect(s.total).toBe(0);
  });

  it("undo van net getypte woorden binnen 20 s: vallen weg", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.deleteRange(0, s.doc.length, "undo");
    expect(s.total).toBe(0);
  });

  it("redo van net getypte woorden geeft ze terug", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.deleteRange(0, s.doc.length, "undo");
    expect(s.total).toBe(0);
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.total).toBe(3);
  });

  it("undo, redo, undo blijft kloppen", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.deleteRange(0, s.doc.length, "undo");
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.counter.pending).toBe(3);
    s.deleteRange(0, s.doc.length, "undo");
    expect(s.total).toBe(0);
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.total).toBe(3);
  });

  it("redo van geplakte tekst = 0", () => {
    const s = new Sim();
    s.change(0, 0, "een twee drie ", "input.paste");
    s.deleteRange(0, s.doc.length, "undo");
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.total).toBe(0);
  });

  it("undo na het venster trekt niets af en redo geeft niets terug", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.wait(30);
    s.deleteRange(0, s.doc.length, "undo");
    expect(s.total).toBe(3);
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.total).toBe(3);
  });

  it("alleen de getypte woorden komen terug bij redo van getypt en geplakt", () => {
    const s = new Sim();
    s.change(0, 0, "geplakt stuk ", "input.paste");
    s.type("een twee ");
    s.deleteRange(0, s.doc.length, "undo");
    expect(s.total).toBe(0);
    s.change(0, 0, "geplakt stuk een twee ", "redo");
    expect(s.total).toBe(2);
  });

  it("nieuw typen tussen undo en redo wist de redo-stapel", () => {
    const s = new Sim();
    s.type("een twee ");
    s.deleteRange(0, s.doc.length, "undo");
    s.type("vier ");
    expect(s.total).toBe(1);
    s.change(0, 0, "een twee ", "redo");
    expect(s.total).toBe(1);
  });

  it("redo zonder voorafgaande undo = 0", () => {
    const s = new Sim();
    s.change(0, 0, "een twee drie ", "redo");
    expect(s.total).toBe(0);
  });

  it("undo van een eerdere wissing voegt niets toe", () => {
    const s = new Sim("een twee drie");
    s.deleteRange(0, 13);
    s.change(0, 0, "een twee drie", "undo");
    expect(s.total).toBe(0);
  });

  it("buiten de gekozen mappen = 0", () => {
    const s = new Sim("", "Dagboek/vandaag.md");
    s.type("een twee drie ");
    expect(s.total).toBe(0);
  });

  it("geen bestand (geen gewone notitie) = 0", () => {
    const s = new Sim();
    s.tracker.setPath(null);
    s.type("een twee ");
    expect(s.total).toBe(0);
  });

  it("geneste mappen: elke map +1, dagtotaal +1", () => {
    const s = new Sim("", "Schrijven/Roman/h1.md", ["Schrijven", "Schrijven/Roman"]);
    s.type("een ");
    expect(s.counter.today().folders["Schrijven"]).toBe(1);
    expect(s.counter.today().folders["Schrijven/Roman"]).toBe(1);
    expect(s.total).toBe(1);
  });

  it("frontmatter = 0", () => {
    const s = new Sim("---\ntitle: x\n---\n");
    s.typeAt(12, " nog meer woorden");
    expect(s.total).toBe(0);
    s.type("echte tekst ");
    expect(s.total).toBe(2);
  });

  it("autocomplete telt als getypt (+1)", () => {
    const s = new Sim("");
    s.type("[[");
    expect(s.total).toBe(0);
    s.change(2, 2, "Notitie]]", "input.complete");
    expect(s.total).toBe(1);
  });

  it("autocomplete van een deels getypt woord = 1 in totaal", () => {
    const s = new Sim("");
    s.type("ha");
    s.change(0, 2, "hallo", "input.complete");
    expect(s.total).toBe(1);
  });

  it("IME-invoer telt, tussenstappen niet dubbel", () => {
    const s = new Sim("");
    s.change(0, 0, "n", "input.type.compose");
    s.change(0, 1, "ni", "input.type.compose");
    s.change(0, 2, "nih", "input.type.compose");
    expect(s.total).toBe(1);
  });

  it("correctievenster 0 = uit: wissen trekt niets af", () => {
    const s = new Sim("", "Schrijven/a.md", ["Schrijven"], 0);
    s.type("een twee drie ");
    s.deleteRange(0, s.doc.length);
    expect(s.total).toBe(3);
    expect(s.counter.pending).toBe(0);
  });
});

describe("correctievenster", () => {
  it("een woord letter voor letter wissen valt uit de telling", () => {
    const s = new Sim();
    s.type("hallo ");
    s.backspace(1);
    expect(s.total).toBe(1);
    s.backspace(5);
    expect(s.total).toBe(0);
  });

  it("eerste letter van een nieuw woord vervangen houdt het woord op 1", () => {
    const s = new Sim();
    s.type("xallo ");
    s.change(0, 1, "h", "input.type");
    expect(s.total).toBe(1);
    expect(s.counter.pending).toBe(1);
    s.deleteRange(0, 5);
    expect(s.total).toBe(0);
  });

  it("eerste letter wissen en opnieuw typen houdt het woord op 1", () => {
    const s = new Sim();
    s.type("xallo ");
    s.deleteRange(0, 1, "delete.forward");
    s.typeAt(0, "h");
    expect(s.total).toBe(1);
    s.deleteRange(0, 5);
    expect(s.total).toBe(0);
  });

  it("alleen het gewiste woord valt weg, de rest blijft", () => {
    const s = new Sim();
    s.type("een twee drie ");
    s.deleteRange(4, 9); // "twee "
    expect(s.total).toBe(2);
    expect(s.counter.pending).toBe(2);
  });

  it("woorden worden definitief na het venster en tikken door de klok af", () => {
    const s = new Sim();
    s.type("een twee ");
    expect(s.counter.pending).toBe(2);
    s.wait(21);
    s.tracker.expire(s.now);
    expect(s.counter.pending).toBe(0);
    expect(s.total).toBe(2);
  });

  it("andere bestanden: woorden in de wacht worden definitief", () => {
    const s = new Sim();
    s.type("een twee ");
    s.tracker.setPath("Schrijven/ander.md");
    expect(s.counter.pending).toBe(0);
    expect(s.total).toBe(2);
  });

  it("afsluiten: woorden in de wacht blijven geteld en zijn definitief", () => {
    const s = new Sim();
    s.type("een twee ");
    s.counter.commitAll();
    expect(s.counter.pending).toBe(0);
    expect(s.total).toBe(2);
  });

  it("een wijziging zonder label die een woord weghaalt, trekt niets af", () => {
    const s = new Sim();
    s.type("een twee ");
    s.change(0, s.doc.length, "");
    expect(s.total).toBe(2);
    expect(s.counter.pending).toBe(0);
  });

  it("typen midden in een nieuw woord telt niet dubbel", () => {
    const s = new Sim();
    s.type("hllo ");
    s.typeAt(1, "a");
    expect(s.doc).toBe("hallo ");
    expect(s.total).toBe(1);
  });
});

describe("dagwissel en opslag", () => {
  it("doortypen over 02:00: woorden vallen op de juiste dag", () => {
    const s = new Sim();
    s.now = new Date(2026, 9, 28, 1, 59, 50).getTime();
    s.type("voor ");
    s.now = new Date(2026, 9, 28, 2, 0, 10).getTime();
    s.type("na ");
    expect(s.store.day("2026-10-27").total).toBe(1);
    expect(s.store.day("2026-10-28").total).toBe(1);
  });

  it("een correctie na de dagwissel raakt de dag waarop het woord is geboekt", () => {
    const s = new Sim();
    s.now = new Date(2026, 9, 28, 1, 59, 55).getTime();
    s.type("voor ");
    s.now = new Date(2026, 9, 28, 2, 0, 5).getTime();
    s.deleteRange(0, s.doc.length);
    expect(s.store.day("2026-10-27").total).toBe(0);
    expect(s.store.day("2026-10-28").total).toBe(0);
  });

  it("woorden komen in de store per dag en per map", () => {
    const s = new Sim("", "Schrijven/Roman/h1.md", ["Schrijven", "Schrijven/Roman"]);
    s.type("een twee ");
    expect(s.store.day("2026-10-28")).toEqual({
      total: 2,
      folders: { Schrijven: 2, "Schrijven/Roman": 2 },
    });
    expect(s.store.totalEver()).toBe(2);
  });

  it("de teller van vandaag begint bij 0 op een nieuwe dag", () => {
    const s = new Sim();
    s.type("een twee ");
    s.now = new Date(2026, 9, 29, 3, 0, 0).getTime();
    expect(s.counter.today().total).toBe(0);
    expect(s.store.totalEver()).toBe(2);
  });
});

describe("matchFolders", () => {
  it("geen mappen gekozen = niets telt", () => {
    expect(matchFolders("a/b.md", [])).toEqual([]);
  });

  it("submappen tellen mee voor de bovenliggende map", () => {
    expect(matchFolders("Schrijven/Roman/h1.md", ["Schrijven"])).toEqual(["Schrijven"]);
    expect(matchFolders("Schrijven/Roman/h1.md", ["Schrijven", "Schrijven/Roman"])).toEqual([
      "Schrijven",
      "Schrijven/Roman",
    ]);
  });

  it("een mapnaam als voorvoegsel telt niet", () => {
    expect(matchFolders("Schrijvenx/a.md", ["Schrijven"])).toEqual([]);
  });

  it("slashes aan de rand worden genegeerd", () => {
    expect(matchFolders("Blog/a.md", ["/Blog/"])).toEqual(["Blog"]);
  });

  it("bestand in de root hoort bij geen map", () => {
    expect(matchFolders("a.md", ["Blog"])).toEqual([]);
  });
});

describe("frontmatterEnd", () => {
  const end = (s: string) => frontmatterEnd(EditorState.create({ doc: s }).doc);

  it("geeft het einde van het blok", () => {
    expect(end("---\na: b\n---\ntekst")).toBe(12);
  });

  it("0 zonder frontmatter of zonder sluiting", () => {
    expect(end("tekst")).toBe(0);
    expect(end("---\na: b\ntekst")).toBe(0);
    expect(end("---")).toBe(0);
  });
});

// Voorkomt dat Transaction ongebruikt lijkt in type-only gebruik.
void Transaction;

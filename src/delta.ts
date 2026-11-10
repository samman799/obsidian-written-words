import { Text, Transaction } from "@codemirror/state";
import { countWords, findWords, WordRange } from "./wordCount";

const MAX_FRONTMATTER_LINES = 500;

// Einde (offset) van de afsluitende `---`-regel van de frontmatter, of 0 als die er niet is.
export function frontmatterEnd(doc: Text): number {
  if (doc.lines < 2 || doc.line(1).text.trimEnd() !== "---") return 0;
  const last = Math.min(doc.lines, MAX_FRONTMATTER_LINES);
  for (let i = 2; i <= last; i++) {
    if (doc.line(i).text.trimEnd() === "---") return doc.line(i).to;
  }
  return 0;
}

// Breidt een stuk uit tot hele woorden: links en rechts door tot de eerste witruimte (binnen de regel).
export function expandToToken(doc: Text, from: number, to: number): WordRange {
  const left = doc.lineAt(from);
  while (from > left.from && !/\s/.test(left.text[from - 1 - left.from])) from--;
  const right = doc.lineAt(to);
  while (to < right.to && !/\s/.test(right.text[to - right.from])) to++;
  return { from, to };
}

export interface TypedChange {
  // Aantal nieuwe woorden in deze transactie (nooit negatief).
  added: number;
  // Posities (in het nieuwe document) van die nieuwe woorden.
  words: WordRange[];
}

// De delta-methode: per wijziging de woorden rond de wijziging tellen, voor en na.
// Alleen een positief verschil telt.
export function analyzeTyped(tr: Transaction): TypedChange {
  const before = tr.startState.doc;
  const after = tr.state.doc;
  const fmEnd = frontmatterEnd(after);
  const result: TypedChange = { added: 0, words: [] };

  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
    if (fromB < fmEnd) return;
    const a = expandToToken(before, fromA, toA);
    const b = expandToToken(after, fromB, toB);
    const wordsBefore = countWords(before.sliceString(a.from, a.to));
    const wordsAfter = findWords(after.sliceString(b.from, b.to)).map((w) => ({
      from: w.from + b.from,
      to: w.to + b.from,
    }));
    const n = wordsAfter.length - wordsBefore;
    if (n <= 0) return;
    // De nieuwe woorden zijn die welke de wijziging raken; bij twijfel de meest rechtse.
    const touching = wordsAfter.filter((w) => w.to >= fromB && w.from <= toB);
    result.added += n;
    result.words.push(...touching.slice(-n));
  });

  return result;
}

// De woorden in de tekst die een transactie invoegt (voor redo, waar het aantal al bekend is).
export function wordsInInsertions(tr: Transaction): WordRange[] {
  const after = tr.state.doc;
  const words: WordRange[] = [];
  tr.changes.iterChanges((_fa, _ta, fromB, toB, inserted) => {
    if (inserted.length === 0) return;
    const b = expandToToken(after, fromB, toB);
    for (const w of findWords(after.sliceString(b.from, b.to))) {
      const from = w.from + b.from;
      const to = w.to + b.from;
      if (to >= fromB && from <= toB) words.push({ from, to });
    }
  });
  return words;
}

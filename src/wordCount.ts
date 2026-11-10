// Een woord is een reeks letters of cijfers (Unicode). Apostrof en koppelteken
// tussen letters/cijfers horen erbij: zo'n, auto's, zelf-standig.
const WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

export interface WordRange {
  from: number;
  to: number;
}

export function countWords(text: string): number {
  return text.match(WORD)?.length ?? 0;
}

export function findWords(text: string): WordRange[] {
  return Array.from(text.matchAll(WORD), (m) => ({
    from: m.index!,
    to: m.index! + m[0].length,
  }));
}

// Frontmatter is het `---`-blok helemaal bovenaan een notitie.
const FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;

export function stripFrontmatter(text: string): string {
  return text.replace(FRONTMATTER, "");
}

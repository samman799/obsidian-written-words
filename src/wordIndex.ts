import { matchFolders } from "./folders";

// Houdt per bestand het aantal woorden bij en daaruit de totalen per gekozen map en overall.
// Een bestand in twee geneste mappen telt voor beide mappen, maar één keer in het totaal.
export class WordIndex {
  private files = new Map<string, number>();
  private byFolder = new Map<string, number>();
  private all = 0;

  constructor(private folders: string[] = []) {}

  // Nieuwe mappen: begin opnieuw (de bestanden moeten daarna opnieuw worden ingelezen).
  reset(folders: string[]) {
    this.folders = folders;
    this.files.clear();
    this.byFolder.clear();
    this.all = 0;
  }

  matches(path: string): boolean {
    return matchFolders(path, this.folders).length > 0;
  }

  set(path: string, words: number) {
    const targets = matchFolders(path, this.folders);
    if (targets.length === 0) {
      this.remove(path);
      return;
    }
    const delta = words - (this.files.get(path) ?? 0);
    this.files.set(path, words);
    this.all += delta;
    for (const f of targets) this.byFolder.set(f, (this.byFolder.get(f) ?? 0) + delta);
  }

  remove(path: string) {
    const old = this.files.get(path);
    if (old === undefined) return;
    this.files.delete(path);
    this.all -= old;
    for (const f of matchFolders(path, this.folders)) {
      this.byFolder.set(f, (this.byFolder.get(f) ?? 0) - old);
    }
  }

  folderTotal(folder: string): number {
    return this.byFolder.get(folder) ?? 0;
  }

  total(): number {
    return this.all;
  }

  get size(): number {
    return this.files.size;
  }
}

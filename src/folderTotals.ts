import { App, TAbstractFile, TFile } from "obsidian";
import { WordIndex } from "./wordIndex";
import { countWords, stripFrontmatter } from "./wordCount";

const BATCH = 50;
const MODIFY_DEBOUNCE_MS = 1000;

const yieldToUi = () => new Promise<void>((resolve) => window.setTimeout(resolve, 0));

// Het totaal aantal woorden dat nu in de gekozen mappen staat: één scan bij het opstarten,
// daarna per bestand bijwerken bij wijzigen, aanmaken, verwijderen en hernoemen.
export class FolderTotals {
  readonly index = new WordIndex();
  ready = false;
  private scanId = 0;
  private timers = new Map<string, number>();

  constructor(
    private app: App,
    private getFolders: () => string[],
    private onChange: () => void,
    private log: (message: string) => void = () => {},
  ) {}

  private async read(file: TFile): Promise<number> {
    return countWords(stripFrontmatter(await this.app.vault.cachedRead(file)));
  }

  // Leest alle notities in de gekozen mappen in, in porties zodat Obsidian vlot blijft.
  async scan() {
    const id = ++this.scanId;
    const started = performance.now();
    this.ready = false;
    this.index.reset(this.getFolders());
    this.onChange();

    const files = this.app.vault.getMarkdownFiles().filter((f) => this.index.matches(f.path));
    for (let i = 0; i < files.length; i += BATCH) {
      const counts = await Promise.all(files.slice(i, i + BATCH).map((f) => this.read(f).catch(() => 0)));
      if (id !== this.scanId) return; // er is intussen een nieuwe scan gestart
      counts.forEach((n, j) => this.index.set(files[i + j].path, n));
      await yieldToUi();
    }
    if (id !== this.scanId) return;
    this.ready = true;
    this.log(`scan van ${files.length} notities in ${Math.round(performance.now() - started)} ms`);
    this.onChange();
  }

  // Alleen opnieuw scannen als de mappen echt anders zijn.
  private signature = "";
  async rescanIfFoldersChanged() {
    const signature = JSON.stringify(this.getFolders());
    if (signature === this.signature) return;
    this.signature = signature;
    await this.scan();
  }

  async initialScan() {
    this.signature = JSON.stringify(this.getFolders());
    await this.scan();
  }

  handleModify(file: TAbstractFile) {
    if (!this.isNote(file)) return;
    const path = file.path;
    window.clearTimeout(this.timers.get(path));
    this.timers.set(
      path,
      window.setTimeout(() => {
        this.timers.delete(path);
        void this.update(file as TFile);
      }, MODIFY_DEBOUNCE_MS),
    );
  }

  handleCreate(file: TAbstractFile) {
    if (this.isNote(file)) void this.update(file as TFile);
  }

  handleDelete(file: TAbstractFile) {
    window.clearTimeout(this.timers.get(file.path));
    this.timers.delete(file.path);
    this.index.remove(file.path);
    this.onChange();
  }

  handleRename(file: TAbstractFile, oldPath: string) {
    window.clearTimeout(this.timers.get(oldPath));
    this.timers.delete(oldPath);
    this.index.remove(oldPath);
    if (this.isNote(file)) void this.update(file as TFile);
    else this.onChange();
  }

  destroy() {
    this.scanId++;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
  }

  private isNote(file: TAbstractFile): boolean {
    return file instanceof TFile && file.extension === "md";
  }

  private async update(file: TFile) {
    if (!this.index.matches(file.path)) {
      this.index.remove(file.path);
    } else {
      this.index.set(file.path, await this.read(file).catch(() => 0));
    }
    this.onChange();
  }
}

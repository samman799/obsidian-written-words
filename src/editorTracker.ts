import { Transaction } from "@codemirror/state";
import { WordCounter } from "./counter";
import { analyzeTyped, expandToToken, wordsInInsertions } from "./delta";
import { matchFolders } from "./folders";
import { countWords } from "./wordCount";

export interface TrackerOptions {
  folders: string[];
  correctionWindowMs: number;
  log?: (message: string) => void;
}

// Een nieuw woord dat nog in het correctievenster zit. Telt al mee, tot het gewist wordt.
interface Pending {
  from: number;
  to: number;
  expires: number;
  folders: string[];
  // Dag waarop het woord is geboekt, ook als een correctie na middernacht komt.
  day: string;
}

// Wat één undo aan getypte woorden heeft weggehaald; de bijbehorende redo geeft precies dat terug.
interface UndoRecord {
  folders: string[][];
}

// Volgt één editor (één open notitie in één paneel).
export class EditorTracker {
  private pending: Pending[] = [];
  // Loopt gelijk met de redo-stapel van de editor: één record per undo.
  private redoStack: UndoRecord[] = [];
  private path: string | null = null;

  constructor(
    private counter: WordCounter,
    private getOptions: () => TrackerOptions,
  ) {
    counter.register(this);
  }

  // Pad van het bestand in deze editor; null = geen gewone notitie. Bij een ander bestand
  // zijn de posities van de woorden in de wacht niets meer waard: die worden definitief.
  setPath(path: string | null) {
    if (path === this.path) return;
    this.commitAll();
    this.redoStack = [];
    this.path = path;
  }

  destroy() {
    this.commitAll();
    this.counter.unregister(this);
  }

  handle(tr: Transaction, now: number) {
    const options = this.getOptions();
    this.expire(now);

    const removing = tr.isUserEvent("delete") || tr.isUserEvent("undo");
    const typed = tr.isUserEvent("input.type") || tr.isUserEvent("input.complete");
    const killed = this.mapPending(tr, removing, typed, options);

    if (tr.isUserEvent("undo")) {
      this.redoStack.push({ folders: killed.map((p) => p.folders) });
    } else if (tr.isUserEvent("redo")) {
      this.redo(tr, now, options);
      return;
    } else {
      // Een nieuwe wijziging gooit de redo-stapel van de editor weg.
      this.redoStack = [];
    }

    const label = tr.annotation(Transaction.userEvent) ?? "(geen label)";
    if (!typed) {
      options.log?.(`genegeerd: ${label}`);
      return;
    }
    if (this.path === null) return;
    const folders = matchFolders(this.path, options.folders);
    if (folders.length === 0) {
      options.log?.(`buiten de gekozen mappen: ${this.path}`);
      return;
    }

    const { added, words } = analyzeTyped(tr);
    if (added === 0) return;
    const day = this.counter.add(folders, added);
    if (options.correctionWindowMs > 0) {
      for (const w of words) {
        this.pending.push({ ...w, expires: now + options.correctionWindowMs, folders, day });
      }
      this.counter.adjustPending(words.length);
    }
  }

  // Redo geeft terug wat de bijbehorende undo aan getypte woorden heeft weggehaald, niet meer.
  // Geplakte tekst of woorden die al definitief waren, zaten daar niet bij.
  private redo(tr: Transaction, now: number, options: TrackerOptions) {
    const record = this.redoStack.pop();
    if (!record || record.folders.length === 0) {
      options.log?.("genegeerd: redo");
      return;
    }
    const days = record.folders.map((folders) => this.counter.add(folders, 1));
    if (options.correctionWindowMs > 0) {
      const words = wordsInInsertions(tr).slice(-record.folders.length);
      const offset = record.folders.length - words.length;
      words.forEach((w, i) => {
        const folders = record.folders[offset + i];
        const day = days[offset + i];
        this.pending.push({ ...w, expires: now + options.correctionWindowMs, folders, day });
      });
      this.counter.adjustPending(words.length);
    }
  }

  // Woorden waarvan het venster voorbij is, worden definitief.
  expire(now: number) {
    const expired = this.pending.filter((p) => p.expires <= now);
    if (expired.length === 0) return;
    this.pending = this.pending.filter((p) => p.expires > now);
    this.counter.adjustPending(-expired.length);
  }

  commitAll() {
    if (this.pending.length === 0) return;
    this.counter.adjustPending(-this.pending.length);
    this.pending = [];
  }

  // Schuift de posities mee met de wijziging. Raakt wissen of undo een woord helemaal,
  // dan valt het uit de telling. Bij andere wijzigingen blijft het woord gewoon geteld.
  private mapPending(
    tr: Transaction,
    removing: boolean,
    typed: boolean,
    options: TrackerOptions,
  ): Pending[] {
    if (this.pending.length === 0) return [];
    const doc = tr.state.doc;

    // Naar binnen schuiven: tekst die naast een woord wordt ingevoegd hoort er niet bij.
    for (const p of this.pending) {
      p.from = tr.changes.mapPos(p.from, 1);
      p.to = tr.changes.mapPos(p.to, -1);
    }

    // Getypte tekens aan of in een woord horen wel bij dat woord (heel woord, tot de witruimte).
    if (typed) {
      tr.changes.iterChanges((_fa, _ta, fromB, toB, inserted) => {
        if (inserted.length === 0 || /\s/.test(inserted.toString())) return;
        const token = expandToToken(doc, fromB, toB);
        for (const p of this.pending) {
          if (fromB <= p.to && toB >= p.from) {
            p.from = Math.min(p.from, token.from);
            p.to = Math.max(p.to, token.to);
          }
        }
      });
    }

    const alive: Pending[] = [];
    const killed: Pending[] = [];
    for (const p of this.pending) {
      if (p.from < p.to && countWords(doc.sliceString(p.from, p.to)) > 0) {
        alive.push(p);
        continue;
      }
      this.counter.adjustPending(-1);
      if (removing) {
        this.counter.remove(p.folders, 1, p.day);
        killed.push(p);
        options.log?.(`woord binnen het correctievenster gewist: -1`);
      }
    }
    this.pending = alive;
    return killed;
  }
}

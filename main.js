var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => WrittenWordsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian5 = require("obsidian");

// src/csv.ts
function field(value) {
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function buildCsv(days) {
  const folders = [...new Set(Object.values(days).flatMap((d) => Object.keys(d.folders)))].sort();
  const lines = [["datum", "totaal", ...folders].map(field).join(",")];
  for (const key of Object.keys(days).sort()) {
    const d = days[key];
    lines.push([key, d.total, ...folders.map((f) => d.folders[f] ?? 0)].map(field).join(","));
  }
  return "\uFEFF" + lines.join("\n") + "\n";
}

// src/day.ts
var pad = (n) => String(n).padStart(2, "0");
function dayKey(ms, startHour) {
  const d = new Date(ms);
  if (d.getHours() < startHour)
    d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// src/counter.ts
var WordCounter = class {
  constructor(store, getDayStartHour = () => 2, clock = Date.now) {
    this.store = store;
    this.getDayStartHour = getDayStartHour;
    this.clock = clock;
    this.pending = 0;
    this.trackers = /* @__PURE__ */ new Set();
    this.listeners = [];
  }
  currentDay() {
    return dayKey(this.clock(), this.getDayStartHour());
  }
  today() {
    return this.store.day(this.currentDay());
  }
  // Geeft een functie terug waarmee je je weer afmeldt.
  onChange(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
  // Geeft de dag terug waarop het is geboekt, zodat een latere correctie dezelfde dag raakt.
  add(folders, n) {
    const day = this.currentDay();
    this.store.add(day, folders, n);
    this.emit({ type: "add", folders, n });
    return day;
  }
  remove(folders, n, day) {
    this.store.remove(day, folders, n);
    this.emit({ type: "remove", folders, n });
  }
  adjustPending(delta) {
    this.pending += delta;
    this.emit();
  }
  register(t) {
    this.trackers.add(t);
  }
  unregister(t) {
    this.trackers.delete(t);
  }
  expireAll(now) {
    this.trackers.forEach((t) => t.expire(now));
  }
  commitAll() {
    this.trackers.forEach((t) => t.commitAll());
  }
  emitChange() {
    this.emit();
  }
  emit(e) {
    this.listeners.forEach((fn) => fn(e));
  }
};

// src/extension.ts
var import_view = require("@codemirror/view");
var import_obsidian = require("obsidian");

// src/editorTracker.ts
var import_state = require("@codemirror/state");

// src/wordCount.ts
var WORD = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
function countWords(text) {
  return text.match(WORD)?.length ?? 0;
}
function findWords(text) {
  return Array.from(text.matchAll(WORD), (m) => ({
    from: m.index,
    to: m.index + m[0].length
  }));
}
var FRONTMATTER = /^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/;
function stripFrontmatter(text) {
  return text.replace(FRONTMATTER, "");
}

// src/delta.ts
var MAX_FRONTMATTER_LINES = 500;
function frontmatterEnd(doc) {
  if (doc.lines < 2 || doc.line(1).text.trimEnd() !== "---")
    return 0;
  const last = Math.min(doc.lines, MAX_FRONTMATTER_LINES);
  for (let i = 2; i <= last; i++) {
    if (doc.line(i).text.trimEnd() === "---")
      return doc.line(i).to;
  }
  return 0;
}
function expandToToken(doc, from, to) {
  const left = doc.lineAt(from);
  while (from > left.from && !/\s/.test(left.text[from - 1 - left.from]))
    from--;
  const right = doc.lineAt(to);
  while (to < right.to && !/\s/.test(right.text[to - right.from]))
    to++;
  return { from, to };
}
function analyzeTyped(tr) {
  const before = tr.startState.doc;
  const after = tr.state.doc;
  const fmEnd = frontmatterEnd(after);
  const result = { added: 0, words: [] };
  tr.changes.iterChanges((fromA, toA, fromB, toB) => {
    if (fromB < fmEnd)
      return;
    const a = expandToToken(before, fromA, toA);
    const b = expandToToken(after, fromB, toB);
    const wordsBefore = countWords(before.sliceString(a.from, a.to));
    const wordsAfter = findWords(after.sliceString(b.from, b.to)).map((w) => ({
      from: w.from + b.from,
      to: w.to + b.from
    }));
    const n = wordsAfter.length - wordsBefore;
    if (n <= 0)
      return;
    const touching = wordsAfter.filter((w) => w.to >= fromB && w.from <= toB);
    result.added += n;
    result.words.push(...touching.slice(-n));
  });
  return result;
}
function wordsInInsertions(tr) {
  const after = tr.state.doc;
  const words = [];
  tr.changes.iterChanges((_fa, _ta, fromB, toB, inserted) => {
    if (inserted.length === 0)
      return;
    const b = expandToToken(after, fromB, toB);
    for (const w of findWords(after.sliceString(b.from, b.to))) {
      const from = w.from + b.from;
      const to = w.to + b.from;
      if (to >= fromB && from <= toB)
        words.push({ from, to });
    }
  });
  return words;
}

// src/store.ts
var SAVE_DELAY_MS = 5e3;
var Store = class {
  constructor(days, save, delayMs = SAVE_DELAY_MS) {
    this.days = days;
    this.save = save;
    this.delayMs = delayMs;
    this.timer = null;
    this.dirty = false;
  }
  day(key) {
    return this.days[key] ?? { total: 0, folders: {} };
  }
  add(key, folders, n) {
    var _a;
    const rec = (_a = this.days)[key] ?? (_a[key] = { total: 0, folders: {} });
    rec.total += n;
    for (const f of folders)
      rec.folders[f] = (rec.folders[f] ?? 0) + n;
    this.markDirty();
  }
  remove(key, folders, n) {
    const rec = this.days[key];
    if (!rec)
      return;
    rec.total = Math.max(0, rec.total - n);
    for (const f of folders) {
      const left = Math.max(0, (rec.folders[f] ?? 0) - n);
      if (left > 0)
        rec.folders[f] = left;
      else
        delete rec.folders[f];
    }
    if (rec.total === 0 && Object.keys(rec.folders).length === 0)
      delete this.days[key];
    this.markDirty();
  }
  // Totaal ooit geschreven.
  totalEver() {
    return Object.values(this.days).reduce((sum, d) => sum + d.total, 0);
  }
  folderTotalEver(folder) {
    return Object.values(this.days).reduce((sum, d) => sum + (d.folders[folder] ?? 0), 0);
  }
  clear() {
    for (const key of Object.keys(this.days))
      delete this.days[key];
    this.markDirty();
    this.flush();
  }
  // Direct wegschrijven (bij afsluiten); doet niets als er niets te bewaren is.
  flush() {
    if (this.timer)
      clearTimeout(this.timer);
    this.timer = null;
    if (!this.dirty)
      return;
    this.dirty = false;
    this.save();
  }
  // Gebufferd: hooguit één keer per `delayMs`, zodat typen vlot blijft.
  markDirty() {
    this.dirty = true;
    if (this.timer)
      return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush();
    }, this.delayMs);
  }
};
var isCount = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
function parseDays(raw) {
  const days = {};
  if (typeof raw !== "object" || raw === null)
    return days;
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof value !== "object" || value === null)
      continue;
    const { total, folders } = value;
    if (!isCount(total))
      continue;
    const clean = {};
    if (typeof folders === "object" && folders !== null) {
      for (const [f, n] of Object.entries(folders))
        if (isCount(n))
          clean[f] = n;
    }
    days[key] = { total, folders: clean };
  }
  return days;
}

// src/settings.ts
var DEFAULT_SETTINGS = {
  folders: [],
  dailyGoal: 500,
  dayStartHour: 2,
  correctionWindowSeconds: 20,
  debug: true
};
var DATA_VERSION = 1;
function normalizeFolder(folder) {
  return folder.trim().replace(/^\/+|\/+$/g, "");
}
function int(value, fallback, min, max = Infinity) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}
function parseSettings(raw) {
  const s = typeof raw === "object" && raw !== null ? raw : {};
  const folders = Array.isArray(s.folders) ? s.folders.filter((f) => typeof f === "string").map(normalizeFolder) : [];
  return {
    folders: [...new Set(folders.filter((f) => f !== ""))],
    dailyGoal: int(s.dailyGoal, DEFAULT_SETTINGS.dailyGoal, 1),
    dayStartHour: int(s.dayStartHour, DEFAULT_SETTINGS.dayStartHour, 0, 23),
    correctionWindowSeconds: int(s.correctionWindowSeconds, DEFAULT_SETTINGS.correctionWindowSeconds, 0),
    debug: typeof s.debug === "boolean" ? s.debug : DEFAULT_SETTINGS.debug
  };
}
function parseData(raw) {
  const d = typeof raw === "object" && raw !== null ? raw : {};
  return {
    version: DATA_VERSION,
    settings: parseSettings(d.settings),
    days: parseDays(d.days)
  };
}

// src/folders.ts
function matchFolders(path, folders) {
  return folders.map(normalizeFolder).filter((f) => f !== "" && path.startsWith(f + "/"));
}

// src/editorTracker.ts
var EditorTracker = class {
  constructor(counter, getOptions) {
    this.counter = counter;
    this.getOptions = getOptions;
    this.pending = [];
    // Loopt gelijk met de redo-stapel van de editor: één record per undo.
    this.redoStack = [];
    this.path = null;
    counter.register(this);
  }
  // Pad van het bestand in deze editor; null = geen gewone notitie. Bij een ander bestand
  // zijn de posities van de woorden in de wacht niets meer waard: die worden definitief.
  setPath(path) {
    if (path === this.path)
      return;
    this.commitAll();
    this.redoStack = [];
    this.path = path;
  }
  destroy() {
    this.commitAll();
    this.counter.unregister(this);
  }
  handle(tr, now) {
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
      this.redoStack = [];
    }
    const label = tr.annotation(import_state.Transaction.userEvent) ?? "(geen label)";
    if (!typed) {
      options.log?.(`genegeerd: ${label}`);
      return;
    }
    if (this.path === null)
      return;
    const folders = matchFolders(this.path, options.folders);
    if (folders.length === 0) {
      options.log?.(`buiten de gekozen mappen: ${this.path}`);
      return;
    }
    const { added, words } = analyzeTyped(tr);
    if (added === 0)
      return;
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
  redo(tr, now, options) {
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
  expire(now) {
    const expired = this.pending.filter((p) => p.expires <= now);
    if (expired.length === 0)
      return;
    this.pending = this.pending.filter((p) => p.expires > now);
    this.counter.adjustPending(-expired.length);
  }
  commitAll() {
    if (this.pending.length === 0)
      return;
    this.counter.adjustPending(-this.pending.length);
    this.pending = [];
  }
  // Schuift de posities mee met de wijziging. Raakt wissen of undo een woord helemaal,
  // dan valt het uit de telling. Bij andere wijzigingen blijft het woord gewoon geteld.
  mapPending(tr, removing, typed, options) {
    if (this.pending.length === 0)
      return [];
    const doc = tr.state.doc;
    for (const p of this.pending) {
      p.from = tr.changes.mapPos(p.from, 1);
      p.to = tr.changes.mapPos(p.to, -1);
    }
    if (typed) {
      tr.changes.iterChanges((_fa, _ta, fromB, toB, inserted) => {
        if (inserted.length === 0 || /\s/.test(inserted.toString()))
          return;
        const token = expandToToken(doc, fromB, toB);
        for (const p of this.pending) {
          if (fromB <= p.to && toB >= p.from) {
            p.from = Math.min(p.from, token.from);
            p.to = Math.max(p.to, token.to);
          }
        }
      });
    }
    const alive = [];
    const killed = [];
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
};

// src/extension.ts
function notePath(state) {
  const file = state.field(import_obsidian.editorInfoField, false)?.file;
  return file && file.extension === "md" ? file.path : null;
}
function trackerExtension(counter, getOptions) {
  return import_view.ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.tracker = new EditorTracker(counter, getOptions);
        this.tracker.setPath(notePath(view.state));
      }
      update(update) {
        this.tracker.setPath(notePath(update.state));
        for (const tr of update.transactions) {
          if (tr.docChanged)
            this.tracker.handle(tr, Date.now());
        }
      }
      destroy() {
        this.tracker.destroy();
      }
    }
  );
}

// src/settingsTab.ts
var import_obsidian2 = require("obsidian");
var FolderSuggest = class extends import_obsidian2.AbstractInputSuggest {
  constructor(app, input) {
    super(app, input);
    this.input = input;
  }
  getSuggestions(query) {
    const q = query.toLowerCase();
    return this.app.vault.getAllLoadedFiles().filter((f) => f instanceof import_obsidian2.TFolder && !f.isRoot()).filter((f) => f.path.toLowerCase().includes(q)).sort((a, b) => a.path.localeCompare(b.path));
  }
  renderSuggestion(folder, el2) {
    el2.setText(folder.path);
  }
  selectSuggestion(folder) {
    this.input.value = folder.path;
    this.input.dispatchEvent(new Event("input"));
    this.close();
  }
};
var ConfirmModal = class extends import_obsidian2.Modal {
  constructor(app, message, confirmText, onConfirm) {
    super(app);
    this.message = message;
    this.confirmText = confirmText;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.contentEl.createEl("p", { text: this.message });
    new import_obsidian2.Setting(this.contentEl).addButton((b) => b.setButtonText("Annuleren").onClick(() => this.close())).addButton(
      (b) => b.setButtonText(this.confirmText).setWarning().onClick(() => {
        this.close();
        this.onConfirm();
      })
    );
  }
  onClose() {
    this.contentEl.empty();
  }
};
var WrittenWordsSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    const { settings } = this.plugin;
    containerEl.empty();
    new import_obsidian2.Setting(containerEl).setName("Mappen").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Alleen woorden die je in deze mappen typt (submappen inbegrepen) worden geteld. Zonder mappen telt er niets."
    });
    for (const folder of settings.folders) {
      new import_obsidian2.Setting(containerEl).setName(folder).addExtraButton(
        (b) => b.setIcon("trash").setTooltip("Verwijderen").onClick(async () => {
          settings.folders = settings.folders.filter((f) => f !== folder);
          await this.plugin.saveSettings();
          this.display();
        })
      );
    }
    let input;
    const add = async () => {
      const folder = normalizeFolder(input.value);
      if (folder === "")
        return;
      if (!(this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian2.TFolder)) {
        new import_obsidian2.Notice(`De map "${folder}" bestaat niet.`);
        return;
      }
      if (settings.folders.includes(folder)) {
        new import_obsidian2.Notice(`"${folder}" staat er al tussen.`);
        return;
      }
      settings.folders.push(folder);
      await this.plugin.saveSettings();
      this.display();
    };
    new import_obsidian2.Setting(containerEl).setName("Map toevoegen").addSearch((s) => {
      input = s.inputEl;
      s.setPlaceholder("Kies een map");
      new FolderSuggest(this.app, s.inputEl);
      s.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          void add();
      });
    }).addButton((b) => b.setButtonText("Toevoegen").setCta().onClick(add));
    new import_obsidian2.Setting(containerEl).setName("Doel en dag").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Dagdoel").setDesc("Aantal woorden per dag, voor alle mappen samen.").addText(
      (t) => t.setValue(String(settings.dailyGoal)).onChange(async (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1)
          return;
        settings.dailyGoal = n;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Begin van de dag").setDesc("Woorden voor dit uur horen bij de vorige dag, bijvoorbeeld 04:00 voor nachtschrijvers.").addDropdown((d) => {
      for (let h = 0; h < 24; h++)
        d.addOption(String(h), `${String(h).padStart(2, "0")}:00`);
      d.setValue(String(settings.dayStartHour)).onChange(async (v) => {
        settings.dayStartHour = Number(v);
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian2.Setting(containerEl).setName("Correctievenster").setDesc("Seconden waarbinnen nieuwe woorden die je weer wist niet tellen. 0 zet het uit.").addText(
      (t) => t.setValue(String(settings.correctionWindowSeconds)).onChange(async (v) => {
        const n = Number(v);
        if (v.trim() === "" || !Number.isFinite(n) || n < 0)
          return;
        settings.correctionWindowSeconds = Math.round(n);
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Gegevens").setHeading();
    new import_obsidian2.Setting(containerEl).setName("Console-logging").setDesc("Toont in de console ook wat er niet geteld wordt en waarom.").addToggle(
      (t) => t.setValue(settings.debug).onChange(async (v) => {
        settings.debug = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian2.Setting(containerEl).setName("Exporteren als CSV").setDesc("Maakt een bestand in de hoofdmap van je vault met de tellingen per dag en per map.").addButton((b) => b.setButtonText("Exporteren").onClick(() => void this.plugin.exportCsv()));
    new import_obsidian2.Setting(containerEl).setName("Geschiedenis wissen").setDesc("Verwijdert alle opgeslagen tellingen. Je instellingen blijven bewaard.").addButton(
      (b) => b.setButtonText("Wissen").setWarning().onClick(
        () => new ConfirmModal(
          this.app,
          "Alle opgeslagen tellingen worden verwijderd. Dit kan niet ongedaan worden gemaakt.",
          "Alles wissen",
          () => this.plugin.clearHistory()
        ).open()
      )
    );
  }
};

// src/folderTotals.ts
var import_obsidian3 = require("obsidian");

// src/wordIndex.ts
var WordIndex = class {
  constructor(folders = []) {
    this.folders = folders;
    this.files = /* @__PURE__ */ new Map();
    this.byFolder = /* @__PURE__ */ new Map();
    this.all = 0;
  }
  // Nieuwe mappen: begin opnieuw (de bestanden moeten daarna opnieuw worden ingelezen).
  reset(folders) {
    this.folders = folders;
    this.files.clear();
    this.byFolder.clear();
    this.all = 0;
  }
  matches(path) {
    return matchFolders(path, this.folders).length > 0;
  }
  set(path, words) {
    const targets = matchFolders(path, this.folders);
    if (targets.length === 0) {
      this.remove(path);
      return;
    }
    const delta = words - (this.files.get(path) ?? 0);
    this.files.set(path, words);
    this.all += delta;
    for (const f of targets)
      this.byFolder.set(f, (this.byFolder.get(f) ?? 0) + delta);
  }
  remove(path) {
    const old = this.files.get(path);
    if (old === void 0)
      return;
    this.files.delete(path);
    this.all -= old;
    for (const f of matchFolders(path, this.folders)) {
      this.byFolder.set(f, (this.byFolder.get(f) ?? 0) - old);
    }
  }
  folderTotal(folder) {
    return this.byFolder.get(folder) ?? 0;
  }
  total() {
    return this.all;
  }
  get size() {
    return this.files.size;
  }
};

// src/folderTotals.ts
var BATCH = 50;
var MODIFY_DEBOUNCE_MS = 1e3;
var yieldToUi = () => new Promise((resolve) => window.setTimeout(resolve, 0));
var FolderTotals = class {
  constructor(app, getFolders, onChange, log = () => {
  }) {
    this.app = app;
    this.getFolders = getFolders;
    this.onChange = onChange;
    this.log = log;
    this.index = new WordIndex();
    this.ready = false;
    this.scanId = 0;
    this.timers = /* @__PURE__ */ new Map();
    // Alleen opnieuw scannen als de mappen echt anders zijn.
    this.signature = "";
  }
  async read(file) {
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
      if (id !== this.scanId)
        return;
      counts.forEach((n, j) => this.index.set(files[i + j].path, n));
      await yieldToUi();
    }
    if (id !== this.scanId)
      return;
    this.ready = true;
    this.log(`scan van ${files.length} notities in ${Math.round(performance.now() - started)} ms`);
    this.onChange();
  }
  async rescanIfFoldersChanged() {
    const signature = JSON.stringify(this.getFolders());
    if (signature === this.signature)
      return;
    this.signature = signature;
    await this.scan();
  }
  async initialScan() {
    this.signature = JSON.stringify(this.getFolders());
    await this.scan();
  }
  handleModify(file) {
    if (!this.isNote(file))
      return;
    const path = file.path;
    window.clearTimeout(this.timers.get(path));
    this.timers.set(
      path,
      window.setTimeout(() => {
        this.timers.delete(path);
        void this.update(file);
      }, MODIFY_DEBOUNCE_MS)
    );
  }
  handleCreate(file) {
    if (this.isNote(file))
      void this.update(file);
  }
  handleDelete(file) {
    window.clearTimeout(this.timers.get(file.path));
    this.timers.delete(file.path);
    this.index.remove(file.path);
    this.onChange();
  }
  handleRename(file, oldPath) {
    window.clearTimeout(this.timers.get(oldPath));
    this.timers.delete(oldPath);
    this.index.remove(oldPath);
    if (this.isNote(file))
      void this.update(file);
    else
      this.onChange();
  }
  destroy() {
    this.scanId++;
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
  }
  isNote(file) {
    return file instanceof import_obsidian3.TFile && file.extension === "md";
  }
  async update(file) {
    if (!this.index.matches(file.path)) {
      this.index.remove(file.path);
    } else {
      this.index.set(file.path, await this.read(file).catch(() => 0));
    }
    this.onChange();
  }
};

// src/view/StatsView.ts
var import_obsidian4 = require("obsidian");

// src/stats.ts
var pad2 = (n) => String(n).padStart(2, "0");
function parse(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
function format(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function addDays(key, n) {
  const d = parse(key);
  d.setDate(d.getDate() + n);
  return format(d);
}
function weekStart(key) {
  const day = parse(key).getDay();
  return addDays(key, -((day + 6) % 7));
}
function monthStart(key) {
  return key.slice(0, 8) + "01";
}
function sumRange(days, from, to, folder) {
  let sum = 0;
  for (const [key, rec] of Object.entries(days)) {
    if (key < from || key > to)
      continue;
    sum += folder === void 0 ? rec.total : rec.folders[folder] ?? 0;
  }
  return sum;
}
function streak(days, today, goal) {
  const reached = (key2) => (days[key2]?.total ?? 0) >= goal;
  let key = reached(today) ? today : addDays(today, -1);
  let count = 0;
  while (reached(key)) {
    count++;
    key = addDays(key, -1);
  }
  return count;
}

// src/view/heatmap.ts
var WEEKS = 52;
function levelFor(total, goal) {
  if (total <= 0)
    return 0;
  if (total >= goal)
    return 4;
  const f = total / goal;
  return f <= 1 / 3 ? 1 : f <= 2 / 3 ? 2 : 3;
}
function heatmapColumns(days, today, goal) {
  const first = addDays(weekStart(today), -7 * (WEEKS - 1));
  const columns = [];
  for (let w = 0; w < WEEKS; w++) {
    const column = [];
    for (let d = 0; d < 7; d++) {
      const key = addDays(first, w * 7 + d);
      if (key > today)
        break;
      const total = days[key]?.total ?? 0;
      column.push({ key, total, level: levelFor(total, goal) });
    }
    columns.push(column);
  }
  return columns;
}
var SVG = "http://www.w3.org/2000/svg";
var CELL = 11;
var GAP = 3;
var LEFT = 22;
var TOP = 16;
var monthFormat = new Intl.DateTimeFormat("nl-NL", { month: "short" });
var dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
var numberFormat = new Intl.NumberFormat("nl-NL");
function el(tag, attrs) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs))
    node.setAttribute(k, String(v));
  return node;
}
function parseKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
function drawHeatmap(columns, today) {
  const width = LEFT + columns.length * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);
  const svg = el("svg", { class: "ww-heatmap", width, height, viewBox: `0 0 ${width} ${height}` });
  ["ma", "wo", "vr"].forEach((label, i) => {
    const t = el("text", { class: "ww-heat-label", x: 0, y: TOP + i * 2 * (CELL + GAP) + CELL - 2 });
    t.textContent = label;
    svg.appendChild(t);
  });
  let lastMonth = -1;
  columns.forEach((column, x) => {
    if (column.length === 0)
      return;
    const month = parseKey(column[0].key).getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      const t = el("text", { class: "ww-heat-label", x: LEFT + x * (CELL + GAP), y: 10 });
      t.textContent = monthFormat.format(parseKey(column[0].key));
      svg.appendChild(t);
    }
    column.forEach((cell, y) => {
      const rect = el("rect", {
        class: `ww-heat-cell ww-heat-${cell.level}${cell.key === today ? " is-today" : ""}`,
        x: LEFT + x * (CELL + GAP),
        y: TOP + y * (CELL + GAP),
        width: CELL,
        height: CELL,
        rx: 2
      });
      const title = el("title", {});
      title.textContent = `${dateFormat.format(parseKey(cell.key))}: ${numberFormat.format(cell.total)} woorden`;
      rect.appendChild(title);
      svg.appendChild(rect);
    });
  });
  return svg;
}

// src/view/StatsView.ts
var VIEW_TYPE_STATS = "written-words-stats";
var MIN_RENDER_INTERVAL_MS = 1e3;
var nl = new Intl.NumberFormat("nl-NL");
var StatsView = class extends import_obsidian4.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.lastRender = 0;
    this.timer = null;
    this.heatmapSignature = "";
  }
  getViewType() {
    return VIEW_TYPE_STATS;
  }
  getDisplayText() {
    return "Written Words";
  }
  getIcon() {
    return "pencil-line";
  }
  async onOpen() {
    const root = this.contentEl;
    root.empty();
    root.addClass("ww-view");
    const today = root.createDiv({ cls: "ww-section" });
    today.createEl("h4", { text: "Vandaag" });
    const line = today.createDiv({ cls: "ww-today" });
    this.todayEl = line.createSpan({ cls: "ww-big" });
    this.goalEl = line.createSpan({ cls: "ww-muted" });
    this.barEl = today.createDiv({ cls: "ww-bar" }).createDiv({ cls: "ww-bar-fill" });
    this.statusEl = today.createDiv({ cls: "ww-muted ww-status" });
    const periods = root.createDiv({ cls: "ww-section" });
    periods.createEl("h4", { text: "Deze week en maand" });
    const grid = periods.createDiv({ cls: "ww-periods" });
    this.weekEl = this.stat(grid, "Deze week");
    this.monthEl = this.stat(grid, "Deze maand");
    const folders = root.createDiv({ cls: "ww-section" });
    folders.createEl("h4", { text: "Per map" });
    this.foldersEl = folders.createDiv();
    const totals = root.createDiv({ cls: "ww-section" });
    totals.createEl("h4", { text: "Totalen" });
    const totalsGrid = totals.createDiv({ cls: "ww-periods" });
    this.nowAllEl = this.stat(totalsGrid, "Nu in alle mappen");
    this.everEl = this.stat(totalsGrid, "Ooit geschreven");
    const history = root.createDiv({ cls: "ww-section" });
    history.createEl("h4", { text: "Geschiedenis" });
    this.heatmapEl = history.createDiv({ cls: "ww-heatmap-wrap" });
    const legend = history.createDiv({ cls: "ww-legend ww-muted" });
    legend.createSpan({ text: "Minder" });
    for (let level = 0; level <= 4; level++) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "11");
      svg.setAttribute("height", "11");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("class", `ww-heat-cell ww-heat-${level}`);
      rect.setAttribute("width", "11");
      rect.setAttribute("height", "11");
      rect.setAttribute("rx", "2");
      svg.appendChild(rect);
      legend.appendChild(svg);
    }
    legend.createSpan({ text: "Doel gehaald" });
    this.register(this.plugin.counter.onChange(() => this.requestRender()));
    this.render();
  }
  async onClose() {
    if (this.timer !== null)
      window.clearTimeout(this.timer);
    this.timer = null;
  }
  // Ververst hooguit één keer per seconde, ook als er sneller getypt wordt.
  requestRender() {
    if (this.timer !== null)
      return;
    const wait = Math.max(0, this.lastRender + MIN_RENDER_INTERVAL_MS - Date.now());
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.render();
    }, wait);
  }
  stat(parent, label) {
    const box = parent.createDiv({ cls: "ww-stat" });
    const value = box.createDiv({ cls: "ww-stat-value" });
    box.createDiv({ cls: "ww-muted", text: label });
    return value;
  }
  render() {
    this.lastRender = Date.now();
    const { counter, store, settings } = this.plugin;
    const days = store.days;
    const today = counter.currentDay();
    const goal = settings.dailyGoal;
    const total = counter.today().total;
    this.todayEl.setText(nl.format(total));
    this.goalEl.setText(` / ${nl.format(goal)} woorden`);
    this.barEl.style.width = `${Math.min(100, total / goal * 100)}%`;
    this.barEl.toggleClass("is-done", total >= goal);
    const streakDays = streak(days, today, goal);
    this.statusEl.setText(
      total >= goal ? `\u2713 Doel gehaald${streakDays > 1 ? ` \xB7 ${streakDays} dagen op rij` : ""}` : `Nog ${nl.format(goal - total)} te gaan${streakDays > 0 ? ` \xB7 ${streakDays} dagen op rij tot gisteren` : ""}`
    );
    const week = weekStart(today);
    const month = monthStart(today);
    this.weekEl.setText(nl.format(sumRange(days, week, today)));
    this.monthEl.setText(nl.format(sumRange(days, month, today)));
    const { folderTotals } = this.plugin;
    this.nowAllEl.setText(folderTotals.ready ? nl.format(folderTotals.index.total()) : "\u2026");
    this.everEl.setText(nl.format(this.plugin.store.totalEver()));
    this.renderFolders(today, week);
    this.renderHeatmap(today, goal);
  }
  // Alleen opnieuw tekenen als er iets veranderd is, zodat de tooltip bij aanwijzen blijft staan.
  renderHeatmap(today, goal) {
    const columns = heatmapColumns(this.plugin.store.days, today, goal);
    const signature = `${today}|${goal}|${columns.flat().map((c) => c.total).join(",")}`;
    if (signature === this.heatmapSignature)
      return;
    this.heatmapSignature = signature;
    const wrap = this.heatmapEl;
    const firstDraw = wrap.childElementCount === 0;
    wrap.empty();
    wrap.appendChild(drawHeatmap(columns, today));
    if (firstDraw) {
      window.requestAnimationFrame(() => wrap.scrollLeft = wrap.scrollWidth);
    }
  }
  renderFolders(today, week) {
    const { store, settings } = this.plugin;
    const el2 = this.foldersEl;
    el2.empty();
    if (settings.folders.length === 0) {
      el2.createDiv({ cls: "ww-muted", text: "Kies mappen in de instellingen om woorden te tellen." });
      return;
    }
    const table = el2.createEl("table", { cls: "ww-table" });
    const head = table.createEl("thead").createEl("tr");
    for (const h of ["Map", "Vandaag", "Week", "Ooit", "Nu"])
      head.createEl("th", { text: h });
    const body = table.createEl("tbody");
    for (const folder of settings.folders) {
      const row = body.createEl("tr");
      row.createEl("td", { text: folder });
      row.createEl("td", { text: nl.format(sumRange(store.days, today, today, folder)) });
      row.createEl("td", { text: nl.format(sumRange(store.days, week, today, folder)) });
      row.createEl("td", { text: nl.format(store.folderTotalEver(folder)) });
      const { folderTotals } = this.plugin;
      row.createEl("td", {
        text: folderTotals.ready ? nl.format(folderTotals.index.folderTotal(folder)) : "\u2026"
      });
    }
  }
};

// src/main.ts
var WrittenWordsPlugin = class extends import_obsidian5.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async onload() {
    const raw = await this.loadData();
    this.data = parseData(raw);
    this.settings = this.data.settings;
    this.store = new Store(this.data.days, () => this.saveData(this.data));
    this.counter = new WordCounter(this.store, () => this.settings.dayStartHour);
    if (raw === null || raw?.version !== this.data.version)
      await this.saveData(this.data);
    this.statusBar = this.addStatusBarItem();
    this.updateStatusBar();
    this.counter.onChange((e) => {
      this.updateStatusBar();
      if (e && this.settings.debug) {
        const sign = e.type === "add" ? "+" : "-";
        console.log(
          `[Written Words] ${sign}${e.n} (${e.folders.join(", ")}) \xB7 vandaag ${this.counter.today().total}, ${this.counter.pending} in de wacht`
        );
      }
    });
    this.registerEditorExtension(
      trackerExtension(this.counter, () => ({
        folders: this.settings.folders,
        correctionWindowMs: this.settings.correctionWindowSeconds * 1e3,
        log: this.settings.debug ? (m) => console.log(`[Written Words] ${m}`) : void 0
      }))
    );
    let shownDay = this.counter.currentDay();
    this.registerInterval(
      window.setInterval(() => {
        this.counter.expireAll(Date.now());
        const day = this.counter.currentDay();
        if (day !== shownDay) {
          shownDay = day;
          this.counter.emitChange();
        }
      }, 1e3)
    );
    this.registerDomEvent(window, "blur", () => this.store.flush());
    this.registerDomEvent(window, "beforeunload", () => this.store.flush());
    this.folderTotals = new FolderTotals(
      this.app,
      () => this.settings.folders,
      () => this.counter.emitChange(),
      (m) => this.settings.debug && console.log(`[Written Words] ${m}`)
    );
    this.app.workspace.onLayoutReady(() => {
      void this.folderTotals.initialScan();
      this.registerEvent(this.app.vault.on("modify", (f) => this.folderTotals.handleModify(f)));
      this.registerEvent(this.app.vault.on("create", (f) => this.folderTotals.handleCreate(f)));
      this.registerEvent(this.app.vault.on("delete", (f) => this.folderTotals.handleDelete(f)));
      this.registerEvent(
        this.app.vault.on("rename", (f, oldPath) => this.folderTotals.handleRename(f, oldPath))
      );
    });
    this.registerView(VIEW_TYPE_STATS, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("pencil-line", "Written Words: open statistieken", () => this.openStats());
    this.addCommand({
      id: "open-stats",
      name: "Open statistieken",
      callback: () => this.openStats()
    });
    this.addSettingTab(new WrittenWordsSettingTab(this.app, this));
    this.addCommand({
      id: "show-counts",
      name: "Toon tellingen",
      callback: () => {
        const today = this.counter.today();
        const folders = /* @__PURE__ */ new Set([...Object.keys(today.folders), ...this.settings.folders]);
        const rows = [...folders].map(
          (f) => `${f}: vandaag ${today.folders[f] ?? 0}, ooit ${this.store.folderTotalEver(f)}, nu ${this.folderTotals.index.folderTotal(f)}`
        );
        new import_obsidian5.Notice(
          [
            `Vandaag: ${today.total} / ${this.settings.dailyGoal} (${this.counter.pending} in de wacht)`,
            `Ooit geschreven: ${this.store.totalEver()}`,
            `Nu in de mappen: ${this.folderTotals.ready ? this.folderTotals.index.total() : "nog aan het tellen\u2026"}`,
            ...rows
          ].join("\n")
        );
        console.log("[Written Words] opgeslagen dagen:", this.store.days);
      }
    });
  }
  onunload() {
    this.counter.commitAll();
    this.store.flush();
    this.folderTotals.destroy();
  }
  async saveSettings() {
    await this.saveData(this.data);
    this.counter.emitChange();
    void this.folderTotals.rescanIfFoldersChanged();
  }
  async openStats() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_STATS)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE_STATS, active: true });
    }
    workspace.revealLeaf(leaf);
  }
  async exportCsv() {
    const { vault } = this.app;
    const stamp = this.counter.currentDay();
    let path = `written-words-${stamp}.csv`;
    for (let i = 2; vault.getAbstractFileByPath(path); i++)
      path = `written-words-${stamp}-${i}.csv`;
    await vault.create(path, buildCsv(this.store.days));
    new import_obsidian5.Notice(`Ge\xEBxporteerd naar ${path}`);
  }
  clearHistory() {
    this.store.clear();
    this.counter.emitChange();
    new import_obsidian5.Notice("Geschiedenis gewist.");
  }
  updateStatusBar() {
    const { pending } = this.counter;
    this.statusBar.setText(
      `\u270D ${this.counter.today().total} / ${this.settings.dailyGoal} woorden${pending > 0 ? ` (${pending} in de wacht)` : ""}`
    );
  }
};

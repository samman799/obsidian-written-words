import { Notice, Plugin } from "obsidian";
import { buildCsv } from "./csv";
import { WordCounter } from "./counter";
import { trackerExtension } from "./extension";
import { DEFAULT_SETTINGS, parseData, PluginData } from "./settings";
import { WrittenWordsSettingTab } from "./settingsTab";
import { Store } from "./store";
import { FolderTotals } from "./folderTotals";
import { StatsView, VIEW_TYPE_STATS } from "./view/StatsView";

export default class WrittenWordsPlugin extends Plugin {
  settings = DEFAULT_SETTINGS;
  counter!: WordCounter;
  private data!: PluginData;
  store!: Store;
  folderTotals!: FolderTotals;
  private statusBar!: HTMLElement;

  async onload() {
    const raw = await this.loadData();
    this.data = parseData(raw);
    this.settings = this.data.settings;
    this.store = new Store(this.data.days, () => this.saveData(this.data));
    this.counter = new WordCounter(this.store, () => this.settings.dayStartHour);
    // Eenmalig wegschrijven, zodat data.json meteen het volledige formaat heeft.
    if (raw === null || raw?.version !== this.data.version) await this.saveData(this.data);

    this.statusBar = this.addStatusBarItem();
    this.updateStatusBar();
    this.counter.onChange((e) => {
      this.updateStatusBar();
      if (e && this.settings.debug) {
        const sign = e.type === "add" ? "+" : "-";
        console.log(
          `[Written Words] ${sign}${e.n} (${e.folders.join(", ")}) · vandaag ${this.counter.today().total}, ${this.counter.pending} in de wacht`,
        );
      }
    });

    this.registerEditorExtension(
      trackerExtension(this.counter, () => ({
        folders: this.settings.folders,
        correctionWindowMs: this.settings.correctionWindowSeconds * 1000,
        log: this.settings.debug ? (m) => console.log(`[Written Words] ${m}`) : undefined,
      })),
    );

    let shownDay = this.counter.currentDay();
    this.registerInterval(
      window.setInterval(() => {
        this.counter.expireAll(Date.now());
        const day = this.counter.currentDay();
        if (day !== shownDay) {
          shownDay = day; // dagwissel: statusbalk en zijpaneel verversen
          this.counter.emitChange();
        }
      }, 1000),
    );
    // Ook bij het wegklikken of afsluiten alles wegschrijven.
    this.registerDomEvent(window, "blur", () => this.store.flush());
    this.registerDomEvent(window, "beforeunload", () => this.store.flush());

    this.folderTotals = new FolderTotals(
      this.app,
      () => this.settings.folders,
      () => this.counter.emitChange(),
      (m) => this.settings.debug && console.log(`[Written Words] ${m}`),
    );
    // Pas na het laden van de vault scannen en luisteren; eerder vuurt 'create' voor elk bestand.
    this.app.workspace.onLayoutReady(() => {
      void this.folderTotals.initialScan();
      this.registerEvent(this.app.vault.on("modify", (f) => this.folderTotals.handleModify(f)));
      this.registerEvent(this.app.vault.on("create", (f) => this.folderTotals.handleCreate(f)));
      this.registerEvent(this.app.vault.on("delete", (f) => this.folderTotals.handleDelete(f)));
      this.registerEvent(
        this.app.vault.on("rename", (f, oldPath) => this.folderTotals.handleRename(f, oldPath)),
      );
    });

    this.registerView(VIEW_TYPE_STATS, (leaf) => new StatsView(leaf, this));
    this.addRibbonIcon("pencil-line", "Written Words: open statistieken", () => this.openStats());
    this.addCommand({
      id: "open-stats",
      name: "Open statistieken",
      callback: () => this.openStats(),
    });

    this.addSettingTab(new WrittenWordsSettingTab(this.app, this));

    this.addCommand({
      id: "show-counts",
      name: "Toon tellingen",
      callback: () => {
        const today = this.counter.today();
        const folders = new Set([...Object.keys(today.folders), ...this.settings.folders]);
        const rows = [...folders].map(
          (f) =>
            `${f}: vandaag ${today.folders[f] ?? 0}, ooit ${this.store.folderTotalEver(f)}, nu ${this.folderTotals.index.folderTotal(f)}`,
        );
        new Notice(
          [
            `Vandaag: ${today.total} / ${this.settings.dailyGoal} (${this.counter.pending} in de wacht)`,
            `Ooit geschreven: ${this.store.totalEver()}`,
            `Nu in de mappen: ${this.folderTotals.ready ? this.folderTotals.index.total() : "nog aan het tellen…"}`,
            ...rows,
          ].join("\n"),
        );
        console.log("[Written Words] opgeslagen dagen:", this.store.days);
      },
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
      leaf = workspace.getRightLeaf(false)!;
      await leaf.setViewState({ type: VIEW_TYPE_STATS, active: true });
    }
    workspace.revealLeaf(leaf);
  }

  async exportCsv() {
    const { vault } = this.app;
    const stamp = this.counter.currentDay();
    let path = `written-words-${stamp}.csv`;
    for (let i = 2; vault.getAbstractFileByPath(path); i++) path = `written-words-${stamp}-${i}.csv`;
    await vault.create(path, buildCsv(this.store.days));
    new Notice(`Geëxporteerd naar ${path}`);
  }

  clearHistory() {
    this.store.clear();
    this.counter.emitChange();
    new Notice("Geschiedenis gewist.");
  }

  private updateStatusBar() {
    const { pending } = this.counter;
    this.statusBar.setText(
      `✍ ${this.counter.today().total} / ${this.settings.dailyGoal} woorden${pending > 0 ? ` (${pending} in de wacht)` : ""}`,
    );
  }
}

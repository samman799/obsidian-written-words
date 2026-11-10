import { ItemView, WorkspaceLeaf } from "obsidian";
import { drawHeatmap, heatmapColumns } from "./heatmap";
import { monthStart, streak, sumRange, weekStart } from "../stats";
import type WrittenWordsPlugin from "../main";

export const VIEW_TYPE_STATS = "written-words-stats";
const MIN_RENDER_INTERVAL_MS = 1000;

const nl = new Intl.NumberFormat("nl-NL");

export class StatsView extends ItemView {
  private lastRender = 0;
  private timer: number | null = null;

  private todayEl!: HTMLElement;
  private goalEl!: HTMLElement;
  private barEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private weekEl!: HTMLElement;
  private monthEl!: HTMLElement;
  private foldersEl!: HTMLElement;
  private nowAllEl!: HTMLElement;
  private everEl!: HTMLElement;
  private heatmapEl!: HTMLElement;
  private heatmapSignature = "";

  constructor(
    leaf: WorkspaceLeaf,
    private plugin: WrittenWordsPlugin,
  ) {
    super(leaf);
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
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = null;
  }

  // Ververst hooguit één keer per seconde, ook als er sneller getypt wordt.
  requestRender() {
    if (this.timer !== null) return;
    const wait = Math.max(0, this.lastRender + MIN_RENDER_INTERVAL_MS - Date.now());
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.render();
    }, wait);
  }

  private stat(parent: HTMLElement, label: string): HTMLElement {
    const box = parent.createDiv({ cls: "ww-stat" });
    const value = box.createDiv({ cls: "ww-stat-value" });
    box.createDiv({ cls: "ww-muted", text: label });
    return value;
  }

  private render() {
    this.lastRender = Date.now();
    const { counter, store, settings } = this.plugin;
    const days = store.days;
    const today = counter.currentDay();
    const goal = settings.dailyGoal;
    const total = counter.today().total;

    this.todayEl.setText(nl.format(total));
    this.goalEl.setText(` / ${nl.format(goal)} woorden`);
    this.barEl.style.width = `${Math.min(100, (total / goal) * 100)}%`;
    this.barEl.toggleClass("is-done", total >= goal);
    const streakDays = streak(days, today, goal);
    this.statusEl.setText(
      total >= goal
        ? `✓ Doel gehaald${streakDays > 1 ? ` · ${streakDays} dagen op rij` : ""}`
        : `Nog ${nl.format(goal - total)} te gaan${streakDays > 0 ? ` · ${streakDays} dagen op rij tot gisteren` : ""}`,
    );

    const week = weekStart(today);
    const month = monthStart(today);
    this.weekEl.setText(nl.format(sumRange(days, week, today)));
    this.monthEl.setText(nl.format(sumRange(days, month, today)));

    const { folderTotals } = this.plugin;
    this.nowAllEl.setText(folderTotals.ready ? nl.format(folderTotals.index.total()) : "…");
    this.everEl.setText(nl.format(this.plugin.store.totalEver()));

    this.renderFolders(today, week);
    this.renderHeatmap(today, goal);
  }

  // Alleen opnieuw tekenen als er iets veranderd is, zodat de tooltip bij aanwijzen blijft staan.
  private renderHeatmap(today: string, goal: number) {
    const columns = heatmapColumns(this.plugin.store.days, today, goal);
    const signature = `${today}|${goal}|${columns.flat().map((c) => c.total).join(",")}`;
    if (signature === this.heatmapSignature) return;
    this.heatmapSignature = signature;
    const wrap = this.heatmapEl;
    const firstDraw = wrap.childElementCount === 0;
    wrap.empty();
    wrap.appendChild(drawHeatmap(columns, today));
    if (firstDraw) {
      // begin bij de meest recente weken
      window.requestAnimationFrame(() => (wrap.scrollLeft = wrap.scrollWidth));
    }
  }

  private renderFolders(today: string, week: string) {
    const { store, settings } = this.plugin;
    const el = this.foldersEl;
    el.empty();
    if (settings.folders.length === 0) {
      el.createDiv({ cls: "ww-muted", text: "Kies mappen in de instellingen om woorden te tellen." });
      return;
    }
    const table = el.createEl("table", { cls: "ww-table" });
    const head = table.createEl("thead").createEl("tr");
    for (const h of ["Map", "Vandaag", "Week", "Ooit", "Nu"]) head.createEl("th", { text: h });
    const body = table.createEl("tbody");
    for (const folder of settings.folders) {
      const row = body.createEl("tr");
      row.createEl("td", { text: folder });
      row.createEl("td", { text: nl.format(sumRange(store.days, today, today, folder)) });
      row.createEl("td", { text: nl.format(sumRange(store.days, week, today, folder)) });
      row.createEl("td", { text: nl.format(store.folderTotalEver(folder)) });
      const { folderTotals } = this.plugin;
      row.createEl("td", {
        text: folderTotals.ready ? nl.format(folderTotals.index.folderTotal(folder)) : "…",
      });
    }
  }
}

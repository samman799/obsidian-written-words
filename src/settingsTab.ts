import {
  AbstractInputSuggest,
  App,
  Modal,
  Notice,
  PluginSettingTab,
  Setting,
  TFolder,
} from "obsidian";
import { normalizeFolder } from "./settings";
import type WrittenWordsPlugin from "./main";

class FolderSuggest extends AbstractInputSuggest<TFolder> {
  constructor(
    app: App,
    private input: HTMLInputElement,
  ) {
    super(app, input);
  }

  getSuggestions(query: string): TFolder[] {
    const q = query.toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter((f): f is TFolder => f instanceof TFolder && !f.isRoot())
      .filter((f) => f.path.toLowerCase().includes(q))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  renderSuggestion(folder: TFolder, el: HTMLElement) {
    el.setText(folder.path);
  }

  selectSuggestion(folder: TFolder) {
    this.input.value = folder.path;
    this.input.dispatchEvent(new Event("input"));
    this.close();
  }
}

class ConfirmModal extends Modal {
  constructor(
    app: App,
    private message: string,
    private confirmText: string,
    private onConfirm: () => void,
  ) {
    super(app);
  }

  onOpen() {
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Annuleren").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText(this.confirmText)
          .setWarning()
          .onClick(() => {
            this.close();
            this.onConfirm();
          }),
      );
  }

  onClose() {
    this.contentEl.empty();
  }
}

export class WrittenWordsSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: WrittenWordsPlugin,
  ) {
    super(app, plugin);
  }

  display() {
    const { containerEl } = this;
    const { settings } = this.plugin;
    containerEl.empty();

    new Setting(containerEl).setName("Mappen").setHeading();
    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "Alleen woorden die je in deze mappen typt (submappen inbegrepen) worden geteld. Zonder mappen telt er niets.",
    });

    for (const folder of settings.folders) {
      new Setting(containerEl).setName(folder).addExtraButton((b) =>
        b
          .setIcon("trash")
          .setTooltip("Verwijderen")
          .onClick(async () => {
            settings.folders = settings.folders.filter((f) => f !== folder);
            await this.plugin.saveSettings();
            this.display();
          }),
      );
    }

    let input!: HTMLInputElement;
    const add = async () => {
      const folder = normalizeFolder(input.value);
      if (folder === "") return;
      if (!(this.app.vault.getAbstractFileByPath(folder) instanceof TFolder)) {
        new Notice(`De map "${folder}" bestaat niet.`);
        return;
      }
      if (settings.folders.includes(folder)) {
        new Notice(`"${folder}" staat er al tussen.`);
        return;
      }
      settings.folders.push(folder);
      await this.plugin.saveSettings();
      this.display();
    };
    new Setting(containerEl)
      .setName("Map toevoegen")
      .addSearch((s) => {
        input = s.inputEl;
        s.setPlaceholder("Kies een map");
        new FolderSuggest(this.app, s.inputEl);
        s.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") void add();
        });
      })
      .addButton((b) => b.setButtonText("Toevoegen").setCta().onClick(add));

    new Setting(containerEl).setName("Doel en dag").setHeading();

    new Setting(containerEl)
      .setName("Dagdoel")
      .setDesc("Aantal woorden per dag, voor alle mappen samen.")
      .addText((t) =>
        t.setValue(String(settings.dailyGoal)).onChange(async (v) => {
          const n = Number(v);
          if (!Number.isInteger(n) || n < 1) return;
          settings.dailyGoal = n;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Begin van de dag")
      .setDesc("Woorden voor dit uur horen bij de vorige dag, bijvoorbeeld 04:00 voor nachtschrijvers.")
      .addDropdown((d) => {
        for (let h = 0; h < 24; h++) d.addOption(String(h), `${String(h).padStart(2, "0")}:00`);
        d.setValue(String(settings.dayStartHour)).onChange(async (v) => {
          settings.dayStartHour = Number(v);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("Correctievenster")
      .setDesc("Seconden waarbinnen nieuwe woorden die je weer wist niet tellen. 0 zet het uit.")
      .addText((t) =>
        t.setValue(String(settings.correctionWindowSeconds)).onChange(async (v) => {
          const n = Number(v);
          if (v.trim() === "" || !Number.isFinite(n) || n < 0) return;
          settings.correctionWindowSeconds = Math.round(n);
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl).setName("Gegevens").setHeading();

    new Setting(containerEl)
      .setName("Console-logging")
      .setDesc("Toont in de console ook wat er niet geteld wordt en waarom.")
      .addToggle((t) =>
        t.setValue(settings.debug).onChange(async (v) => {
          settings.debug = v;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Exporteren als CSV")
      .setDesc("Maakt een bestand in de hoofdmap van je vault met de tellingen per dag en per map.")
      .addButton((b) => b.setButtonText("Exporteren").onClick(() => void this.plugin.exportCsv()));

    new Setting(containerEl)
      .setName("Geschiedenis wissen")
      .setDesc("Verwijdert alle opgeslagen tellingen. Je instellingen blijven bewaard.")
      .addButton((b) =>
        b
          .setButtonText("Wissen")
          .setWarning()
          .onClick(() =>
            new ConfirmModal(
              this.app,
              "Alle opgeslagen tellingen worden verwijderd. Dit kan niet ongedaan worden gemaakt.",
              "Alles wissen",
              () => this.plugin.clearHistory(),
            ).open(),
          ),
      );
  }
}

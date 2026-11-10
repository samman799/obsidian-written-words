import { EditorState } from "@codemirror/state";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";
import { editorInfoField } from "obsidian";
import { WordCounter } from "./counter";
import { EditorTracker, TrackerOptions } from "./editorTracker";

// Alleen gewone notities (geen canvas); null als er (nog) geen bestand is.
function notePath(state: EditorState): string | null {
  const file = state.field(editorInfoField, false)?.file;
  return file && file.extension === "md" ? file.path : null;
}

export function trackerExtension(counter: WordCounter, getOptions: () => TrackerOptions) {
  return ViewPlugin.fromClass(
    class {
      private tracker = new EditorTracker(counter, getOptions);

      constructor(view: { state: EditorState }) {
        this.tracker.setPath(notePath(view.state));
      }

      update(update: ViewUpdate) {
        this.tracker.setPath(notePath(update.state));
        for (const tr of update.transactions) {
          if (tr.docChanged) this.tracker.handle(tr, Date.now());
        }
      }

      destroy() {
        this.tracker.destroy();
      }
    },
  );
}

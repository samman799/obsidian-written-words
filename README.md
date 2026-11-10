# Written Words

An Obsidian plugin that counts the words you actually type in the folders you choose. Pasted text, templates and typo corrections are not counted.

## Installation

Copy `main.js`, `manifest.json` and `styles.css` to `<vault>/.obsidian/plugins/written-words/` and enable the plugin under Settings → Community plugins. See [HANDLEIDING.md](HANDLEIDING.md) for a step-by-step guide (in Dutch).

## Development

```bash
npm install
npm run build    # builds main.js
npm test         # runs the tests
npm run package  # creates dist/written-words/
```

The design and test scenarios are described in [PLAN.md](PLAN.md) (in Dutch).

# Written Words

Obsidian-plugin die telt hoeveel woorden je zelf typt in de mappen die jij kiest. Plakken, templates en tikfoutcorrecties tellen niet mee.

## Installeren

Kopieer `main.js`, `manifest.json` en `styles.css` naar `<vault>/.obsidian/plugins/written-words/` en zet de plugin aan onder Instellingen → Community plugins. Zie [HANDLEIDING.md](HANDLEIDING.md) voor een stap-voor-stap uitleg.

## Ontwikkelen

```bash
npm install
npm run build    # bouwt main.js
npm test         # draait de tests
npm run package  # maakt dist/written-words/
```

Het ontwerp en de testscenario's staan in [PLAN.md](PLAN.md).

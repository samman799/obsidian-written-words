// Zet de bestanden die Obsidian nodig heeft in dist/written-words/.
// Die map kopieer je naar <vault>/.obsidian/plugins/.
import { cpSync, mkdirSync, rmSync } from "node:fs";

const out = "dist/written-words";
rmSync("dist", { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) cpSync(file, `${out}/${file}`);
console.log(`Klaar: ${out}`);

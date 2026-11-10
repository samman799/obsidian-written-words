import { normalizeFolder } from "./settings";

// Alle gekozen mappen waar dit pad onder valt (submappen tellen mee voor de bovenliggende map).
export function matchFolders(path: string, folders: string[]): string[] {
  return folders.map(normalizeFolder).filter((f) => f !== "" && path.startsWith(f + "/"));
}

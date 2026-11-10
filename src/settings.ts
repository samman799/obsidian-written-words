import { DayRecord, parseDays } from "./store";

export interface WrittenWordsSettings {
  folders: string[];
  dailyGoal: number;
  dayStartHour: number;
  correctionWindowSeconds: number;
  // Logt in de console ook wat er genegeerd wordt, om de userEvent-labels te zien.
  debug: boolean;
}

export const DEFAULT_SETTINGS: WrittenWordsSettings = {
  folders: [],
  dailyGoal: 500,
  dayStartHour: 2,
  correctionWindowSeconds: 20,
  debug: true,
};

export const DATA_VERSION = 1;

export interface PluginData {
  version: number;
  settings: WrittenWordsSettings;
  days: Record<string, DayRecord>;
}

export function normalizeFolder(folder: string): string {
  return folder.trim().replace(/^\/+|\/+$/g, "");
}

function int(value: unknown, fallback: number, min: number, max = Infinity): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

export function parseSettings(raw: unknown): WrittenWordsSettings {
  const s = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<WrittenWordsSettings>;
  const folders = Array.isArray(s.folders)
    ? s.folders.filter((f): f is string => typeof f === "string").map(normalizeFolder)
    : [];
  return {
    folders: [...new Set(folders.filter((f) => f !== ""))],
    dailyGoal: int(s.dailyGoal, DEFAULT_SETTINGS.dailyGoal, 1),
    dayStartHour: int(s.dayStartHour, DEFAULT_SETTINGS.dayStartHour, 0, 23),
    correctionWindowSeconds: int(s.correctionWindowSeconds, DEFAULT_SETTINGS.correctionWindowSeconds, 0),
    debug: typeof s.debug === "boolean" ? s.debug : DEFAULT_SETTINGS.debug,
  };
}

export function parseData(raw: unknown): PluginData {
  const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    version: DATA_VERSION,
    settings: parseSettings(d.settings),
    days: parseDays(d.days),
  };
}

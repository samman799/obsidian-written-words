import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseData } from "../src/settings";
import { parseDays, Store } from "../src/store";

describe("Store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("telt per dag en per map, totaal los van de mappen", () => {
    const store = new Store({}, () => {});
    store.add("2026-10-28", ["A", "A/B"], 3);
    expect(store.day("2026-10-28")).toEqual({ total: 3, folders: { A: 3, "A/B": 3 } });
  });

  it("totalen ooit zijn de som van alle dagen", () => {
    const store = new Store({}, () => {});
    store.add("2026-10-27", ["A"], 2);
    store.add("2026-10-28", ["A", "B"], 3);
    expect(store.totalEver()).toBe(5);
    expect(store.folderTotalEver("A")).toBe(5);
    expect(store.folderTotalEver("B")).toBe(3);
  });

  it("remove trekt af, wordt nooit negatief en ruimt lege dagen op", () => {
    const store = new Store({}, () => {});
    store.add("2026-10-28", ["A"], 2);
    store.remove("2026-10-28", ["A"], 1);
    expect(store.day("2026-10-28")).toEqual({ total: 1, folders: { A: 1 } });
    store.remove("2026-10-28", ["A"], 5);
    expect(store.days).toEqual({});
  });

  it("schrijft gebufferd weg: één keer per 5 seconden", () => {
    const save = vi.fn();
    const store = new Store({}, save);
    store.add("2026-10-28", ["A"], 1);
    store.add("2026-10-28", ["A"], 1);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4999);
    expect(save).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("flush schrijft meteen weg en daarna niet nog een keer", () => {
    const save = vi.fn();
    const store = new Store({}, save);
    store.add("2026-10-28", ["A"], 1);
    store.flush();
    expect(save).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10000);
    store.flush();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("clear wist alles en schrijft meteen weg", () => {
    const save = vi.fn();
    const store = new Store({}, save);
    store.add("2026-10-28", ["A"], 1);
    store.clear();
    expect(store.totalEver()).toBe(0);
    expect(save).toHaveBeenCalledTimes(1);
  });
});

describe("parseDays / parseData", () => {
  it("neemt geldige dagen over en slaat rommel over", () => {
    const days = parseDays({
      "2026-10-28": { total: 5, folders: { A: 5, B: "x", C: -1 } },
      "kapot": { total: 1, folders: {} },
      "2026-10-27": { total: "veel" },
      "2026-10-26": null,
    });
    expect(days).toEqual({ "2026-10-28": { total: 5, folders: { A: 5 } } });
  });

  it("data.json uit fase 2 (zonder days) blijft bruikbaar", () => {
    const data = parseData({
      version: 1,
      settings: { folders: ["Schrijven"], correctionWindowSeconds: 20, debug: true },
    });
    expect(data.days).toEqual({});
    expect(data.settings.folders).toEqual(["Schrijven"]);
    expect(data.settings.dailyGoal).toBe(500);
    expect(data.settings.dayStartHour).toBe(2);
  });

  it("zonder data.json komen de standaardwaarden", () => {
    const data = parseData(null);
    expect(data.settings).toEqual({
      folders: [],
      dailyGoal: 500,
      dayStartHour: 2,
      correctionWindowSeconds: 20,
      debug: true,
    });
  });

  it("repareert onzinnige instellingen", () => {
    const { settings } = parseData({
      settings: {
        folders: ["/Blog/", "Blog", "", 5],
        dailyGoal: -3,
        dayStartHour: 99,
        correctionWindowSeconds: "x",
      },
    });
    expect(settings.folders).toEqual(["Blog"]);
    expect(settings.dailyGoal).toBe(1);
    expect(settings.dayStartHour).toBe(23);
    expect(settings.correctionWindowSeconds).toBe(20);
  });
});

import type { EditorTracker } from "./editorTracker";
import { dayKey } from "./day";
import { DayRecord, Store } from "./store";

export interface CountEvent {
  type: "add" | "remove";
  folders: string[];
  n: number;
}

// Boekt woorden op de huidige dag in de store. Woorden in de wacht zitten al in de tellingen;
// `pending` zegt hoeveel dat er zijn.
export class WordCounter {
  pending = 0;
  private trackers = new Set<EditorTracker>();
  private listeners: Array<(e?: CountEvent) => void> = [];

  constructor(
    readonly store: Store,
    private getDayStartHour: () => number = () => 2,
    private clock: () => number = Date.now,
  ) {}

  currentDay(): string {
    return dayKey(this.clock(), this.getDayStartHour());
  }

  today(): DayRecord {
    return this.store.day(this.currentDay());
  }

  // Geeft een functie terug waarmee je je weer afmeldt.
  onChange(fn: (e?: CountEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  // Geeft de dag terug waarop het is geboekt, zodat een latere correctie dezelfde dag raakt.
  add(folders: string[], n: number): string {
    const day = this.currentDay();
    this.store.add(day, folders, n);
    this.emit({ type: "add", folders, n });
    return day;
  }

  remove(folders: string[], n: number, day: string) {
    this.store.remove(day, folders, n);
    this.emit({ type: "remove", folders, n });
  }

  adjustPending(delta: number) {
    this.pending += delta;
    this.emit();
  }

  register(t: EditorTracker) {
    this.trackers.add(t);
  }

  unregister(t: EditorTracker) {
    this.trackers.delete(t);
  }

  expireAll(now: number) {
    this.trackers.forEach((t) => t.expire(now));
  }

  commitAll() {
    this.trackers.forEach((t) => t.commitAll());
  }

  emitChange() {
    this.emit();
  }

  private emit(e?: CountEvent) {
    this.listeners.forEach((fn) => fn(e));
  }
}

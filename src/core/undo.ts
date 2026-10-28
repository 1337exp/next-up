import type { Note } from './model';

/** Что изменилось в одном действии: состояние затронутых заметок до и после (`null` — заметки не было). */
export interface UndoEntry {
    before: Map<string, Note | null>;
    after: Map<string, Note | null>;
}

export function diffEntry(prev: readonly Note[], next: readonly Note[]): UndoEntry | null {
    const was = new Map(prev.map((n) => [n.id, n]));
    const is = new Map(next.map((n) => [n.id, n]));
    const entry: UndoEntry = { before: new Map(), after: new Map() };

    for (const [id, note] of is) {
        if (was.get(id) !== note) {
            entry.before.set(id, was.get(id) ?? null);
            entry.after.set(id, note);
        }
    }
    for (const [id, note] of was) {
        if (!is.has(id)) {
            entry.before.set(id, note);
            entry.after.set(id, null);
        }
    }
    return entry.after.size === 0 ? null : entry;
}

/**
 * Применяет образы к текущему списку. Откат не возвращает старые метки времени: заметка получает `updatedAt = now`,
 * иначе синхронизация сочла бы откат устаревшим и вернула бы всё как было. Заметка, которой раньше не было, не
 * стирается, а помечается удалённой.
 */
function apply(current: readonly Note[], images: Map<string, Note | null>, now: number): Note[] {
    const result = new Map(current.map((n) => [n.id, n]));
    for (const [id, image] of images) {
        if (image) result.set(id, { ...image, updatedAt: now });
        else {
            const existing = result.get(id);
            if (existing) result.set(id, { ...existing, deletedAt: now, updatedAt: now });
        }
    }
    return [...result.values()];
}

/**
 * Отмена и повтор по заметкам, а не по снимкам всего списка: занимает мало памяти и не откатывает чужие
 * изменения, пришедшие при синхронизации.
 */
export class UndoStack {
    private entries: UndoEntry[] = [];
    private index = 0;

    constructor(private readonly limit = 50) {}

    get canUndo(): boolean {
        return this.index > 0;
    }

    get canRedo(): boolean {
        return this.index < this.entries.length;
    }

    record(entry: UndoEntry): void {
        this.entries.length = this.index;
        this.entries.push(entry);
        if (this.entries.length > this.limit) this.entries.shift();
        this.index = this.entries.length;
    }

    undo(current: readonly Note[], now: number): Note[] | null {
        if (!this.canUndo) return null;
        return apply(current, this.entries[--this.index]!.before, now);
    }

    redo(current: readonly Note[], now: number): Note[] | null {
        if (!this.canRedo) return null;
        return apply(current, this.entries[this.index++]!.after, now);
    }

    clear(): void {
        this.entries = [];
        this.index = 0;
    }
}

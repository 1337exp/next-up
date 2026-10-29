import type { Note } from './model';

export interface MergeReport {
    added: number;
    updated: number;
    /** Запись уже есть и не старее пришедшей. */
    skipped: number;
}

/** Победитель при одном id: больший `updatedAt`; при равных побеждает удаление, а дальше остаётся текущая. */
function winner(current: Note, incoming: Note): Note {
    if (incoming.updatedAt !== current.updatedAt) return incoming.updatedAt > current.updatedAt ? incoming : current;
    return current.deletedAt === null && incoming.deletedAt !== null ? incoming : current;
}

/** Слияние по `id` (последняя запись побеждает). Порядок не важен: `merge(a, b)` и `merge(b, a)` дают один набор. */
export function mergeNotes(current: readonly Note[], incoming: readonly Note[]): { notes: Note[]; report: MergeReport } {
    const byId = new Map(current.map((n) => [n.id, n]));
    const report: MergeReport = { added: 0, updated: 0, skipped: 0 };

    for (const note of incoming) {
        const existing = byId.get(note.id);
        if (!existing) {
            byId.set(note.id, note);
            report.added++;
            continue;
        }
        const chosen = winner(existing, note);
        if (chosen === note) {
            byId.set(note.id, note);
            report.updated++;
        } else {
            report.skipped++;
        }
    }

    return { notes: [...byId.values()], report };
}

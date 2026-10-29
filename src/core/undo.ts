import { diffRecords, UndoStack, type UndoEntry } from '@1337exp/taoux/undo';
import type { Note } from './model';

/**
 * Отмена и повтор по заметкам, а не по снимкам всего списка (`undo` из TaoUX): занимает мало памяти и не откатывает
 * чужие изменения, пришедшие при синхронизации. Здесь только правила заметки: две пометки, которые знает приложение.
 */
export type { UndoEntry };
export { COALESCE_MS } from '@1337exp/taoux/undo';

/** Что изменилось между двумя списками, или `null`. Заметки неизменяемы, поэтому сравнение идёт по тождеству. */
export const diffEntry = (prev: readonly Note[], next: readonly Note[]): UndoEntry<Note> | null => diffRecords(prev, next, (note) => note.id);

export function createUndoStack(limit = 50): UndoStack<Note> {
    return new UndoStack<Note>({
        id: (note) => note.id,
        // Откат не возвращает старые метки времени: заметка получает `updatedAt = now`, иначе синхронизация сочла бы
        // откат устаревшим и вернула бы всё как было.
        revive: (note, now) => ({ ...note, updatedAt: now }),
        // Заметка, которой раньше не было, не стирается, а помечается удалённой: надгробие дойдёт до других устройств.
        vanish: (note, now) => ({ ...note, deletedAt: now, updatedAt: now }),
        limit,
        // Окно склейки скользит с каждой правкой: без предела набор без пауз остался бы одним шагом, и одна отмена
        // стёрла бы минуту текста. Шаг растёт не дольше 10 секунд от первой правки.
        coalesceMaxMs: 10_000,
    });
}
import { createSavedStorage } from '@1337exp/taoux/storage';
import { exportSnapshot, upgrade } from '@/core/codec';
import type { Note } from '@/core/model';

export const NOTES_KEY = 'nextup.notes';
/** Ключ прежней версии: читается копированием и остаётся нетронутым как резерв. */
export const V1_KEY = 'nextup-tasks';

export type LoadStatus =
    | 'ok'
    /** Ключа нет: первый запуск. */
    | 'empty'
    /** Данные не читаются: копия отложена в `<ключ>.broken`, список начинается пустым. */
    | 'corrupt'
    /** Записаны более новой версией: читать нечем, перезаписывать нельзя. */
    | 'newer'
    /** Первый запуск после обновления: данные взяты из ключа прежней версии. */
    | 'migrated';

export interface Loaded {
    notes: Note[];
    status: LoadStatus;
    invalid: number;
    /** Можно ли сохранять поверх (false — чтобы не затереть данные новой версии). */
    writable: boolean;
}

function parseJson(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return undefined;
    }
}

export interface NotesRepository {
    load(): Loaded;
    save(notes: readonly Note[], now: number): boolean;
    /** Запись из другой вкладки: вызывает `onChange`. Возвращает отписку. */
    subscribe(onChange: () => void): () => void;
}

export function createNotesRepository(key = NOTES_KEY, v1Key = V1_KEY): NotesRepository {
    const storage = createSavedStorage(key);
    const v1 = createSavedStorage(v1Key);

    function load(): Loaded {
        const text = storage.read();

        if (text === null) {
            const old = v1.read();
            const raw = old === null ? undefined : parseJson(old);
            // v1 хранил `{ schemaVersion, tasks }` без поля `format`
            const result = raw && typeof raw === 'object' && !Array.isArray(raw) ? upgrade({ format: 'nextup', exportedAt: 0, ...raw }) : null;
            if (result?.ok) return { notes: result.snapshot.notes, status: 'migrated', invalid: result.report.invalid, writable: true };
            return { notes: [], status: 'empty', invalid: 0, writable: true };
        }

        const result = upgrade(parseJson(text));
        if (result.ok) return { notes: result.snapshot.notes, status: 'ok', invalid: result.report.invalid, writable: true };
        if (result.error === 'newer') return { notes: [], status: 'newer', invalid: 0, writable: false };

        storage.backupBroken(text);
        return { notes: [], status: 'corrupt', invalid: 0, writable: true };
    }

    return {
        load,
        save: (notes, now) => storage.write(JSON.stringify(exportSnapshot(notes, now))),
        subscribe(onChange) {
            const handler = (event: StorageEvent): void => {
                if (event.key === key) onChange();
            };
            window.addEventListener('storage', handler);
            return () => window.removeEventListener('storage', handler);
        },
    };
}

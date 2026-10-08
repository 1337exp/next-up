/** Все ключи приложения начинаются с этого префикса: защита от коллизий при встраивании. */
export const KEY_PREFIX = 'nextup-';

export const KEYS = {
    settings: `${KEY_PREFIX}settings`,
    tasks: `${KEY_PREFIX}tasks`,
    /** Метки времени синхронизации (см. stores/sync.ts). */
    syncState: `${KEY_PREFIX}sync`,
    /** Копия повреждённых данных задач: после сбоя ничего не теряется молча. */
    tasksCorruptBackup: `${KEY_PREFIX}tasks-corrupt-backup`,
} as const;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface JsonStorage {
    /** `true`, если данные реально сохраняются между запусками (не запасной вариант в памяти). */
    readonly persistent: boolean;
    /** Прочитать JSON; `null`, если ключа нет или данные повреждены. */
    read(key: string): unknown;
    /** Сырой текст как есть; `null`, если ключа нет. Нужен, чтобы отличить «данных нет» от «данные повреждены». */
    readText(key: string): string | null;
    writeText(key: string, text: string): boolean;
    /** Записать JSON; `false`, если не удалось (квота, запрет доступа). Не бросает исключений. */
    write(key: string, value: unknown): boolean;
}

function memoryStorage(): StorageLike {
    const map = new Map<string, string>();
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => void map.set(key, String(value)),
        removeItem: (key) => void map.delete(key),
    };
}

/**
 * `localStorage`, если он доступен. Обращение к нему может бросить исключение
 * (iframe с sandbox, запрет cookies, WebView без DOM storage) — тогда работаем в памяти.
 */
export function resolveStorage(): { storage: StorageLike; persistent: boolean } {
    try {
        const storage = window.localStorage;
        const probe = `${KEY_PREFIX}probe`;
        storage.setItem(probe, '1');
        storage.removeItem(probe);
        return { storage, persistent: true };
    } catch {
        return { storage: memoryStorage(), persistent: false };
    }
}

export function createJsonStorage(storage: StorageLike, persistent = true): JsonStorage {
    function readText(key: string): string | null {
        try {
            return storage.getItem(key);
        } catch {
            return null;
        }
    }

    function writeText(key: string, text: string): boolean {
        try {
            storage.setItem(key, text);
            return true;
        } catch {
            return false;
        }
    }

    return {
        persistent,
        readText,
        writeText,
        read(key) {
            try {
                const raw = readText(key);
                return raw === null ? null : (JSON.parse(raw) as unknown);
            } catch {
                return null;
            }
        },
        write: (key, value) => writeText(key, JSON.stringify(value)),
    };
}

export function createBrowserJsonStorage(): JsonStorage {
    const { storage, persistent } = resolveStorage();
    return createJsonStorage(storage, persistent);
}

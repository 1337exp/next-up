import { SNAPSHOT_SCHEMA_VERSION, type Task } from '@/domain/types';
import { parseTaskRecord } from '@/domain/snapshot';
import { KEYS, type JsonStorage } from './local';

export interface StoredTasks {
    schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
    tasks: Task[];
}

export type LoadStatus =
    | 'ok'
    /** Ключа нет: первый запуск. */
    | 'empty'
    /** Данные не читаются: их копия сохранена под KEYS.tasksCorruptBackup, список начинается пустым. */
    | 'corrupt'
    /** Данные записаны более новой версией приложения: читать можно, перезаписывать — нет. */
    | 'newer-version';

export interface LoadedTasks {
    tasks: Task[];
    status: LoadStatus;
    /** Сколько записей пропущено как непригодные. */
    invalid: number;
    /** Можно ли сохранять поверх (false — чтобы не затереть данные новой версии). */
    writable: boolean;
}

export function loadTasks(storage: JsonStorage): LoadedTasks {
    const text = storage.readText(KEYS.tasks);
    if (text === null) return { tasks: [], status: 'empty', invalid: 0, writable: true };

    const raw = storage.read(KEYS.tasks);
    const isObject = typeof raw === 'object' && raw !== null && !Array.isArray(raw);
    const record = isObject ? (raw as Record<string, unknown>) : null;

    if (!record || !Array.isArray(record.tasks) || typeof record.schemaVersion !== 'number') {
        storage.writeText(KEYS.tasksCorruptBackup, text);
        return { tasks: [], status: 'corrupt', invalid: 0, writable: true };
    }

    const tasks: Task[] = [];
    let invalid = 0;
    for (const item of record.tasks) {
        const task = parseTaskRecord(item);
        if (task) tasks.push(task);
        else invalid++;
    }

    const newer = record.schemaVersion > SNAPSHOT_SCHEMA_VERSION;
    return { tasks, status: newer ? 'newer-version' : 'ok', invalid, writable: !newer };
}

export function saveTasks(storage: JsonStorage, tasks: readonly Task[]): boolean {
    const payload: StoredTasks = { schemaVersion: SNAPSHOT_SCHEMA_VERSION, tasks: [...tasks] };
    return storage.write(KEYS.tasks, payload);
}

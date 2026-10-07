import type { IsoDate } from './date';

export const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'semiannual', 'yearly'] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export function isRecurrence(value: unknown): value is Recurrence {
    return typeof value === 'string' && (RECURRENCES as readonly string[]).includes(value);
}

export interface ChecklistItem {
    text: string;
    done: boolean;
    /** ISO-время последней отметки; `null` — пункт не отмечен. */
    changedAt: string | null;
}

export interface Task {
    id: string;
    /** Срок: календарный день. */
    date: IsoDate;
    /** Заметка в Markdown. */
    note: string;
    checklist: ChecklistItem[];
    recurrence: Recurrence;
    /** Опорная дата серии повторов: повтор n = anchor + n периодов. У копий-повторов та же. */
    anchor: IsoDate;
    /** Завершена до срока (в старом коде — irrelevant). */
    done: boolean;
    /** Следующий повтор уже создан (в старом коде — markProc). */
    rolled: boolean;
    /** Время последнего изменения, мс; нужно для слияния при синхронизации. */
    updatedAt: number;
}

/** Данные формы создания и редактирования. */
export interface TaskInput {
    date: IsoDate;
    note: string;
    checklist: ChecklistItem[];
    recurrence: Recurrence;
}

export const SNAPSHOT_FORMAT = 'nextup';
export const SNAPSHOT_SCHEMA_VERSION = 1;

/** Общий формат обмена: файл экспорта и будущая синхронизация. */
export interface Snapshot {
    format: typeof SNAPSHOT_FORMAT;
    schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
    exportedAt: number;
    tasks: Task[];
}

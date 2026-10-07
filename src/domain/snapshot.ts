import { isValidIsoDate, toIso, type IsoDate } from './date';
import { newId } from './id';
import { isRecurrence, SNAPSHOT_FORMAT, SNAPSHOT_SCHEMA_VERSION, type ChecklistItem, type Recurrence, type Snapshot, type Task } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseChecklistItem(raw: unknown): ChecklistItem | null {
    if (!isRecord(raw) || typeof raw.text !== 'string') return null;
    const done = raw.done === true;
    return { text: raw.text, done, changedAt: done && typeof raw.changedAt === 'string' ? raw.changedAt : null };
}

/** Запись в формате приложения. Любая непригодная запись даёт `null`, а не исключение. */
export function parseTaskRecord(raw: unknown): Task | null {
    if (!isRecord(raw)) return null;
    if (typeof raw.id !== 'string' || raw.id === '') return null;
    if (!isValidIsoDate(raw.date) || typeof raw.note !== 'string' || !Array.isArray(raw.checklist)) return null;

    const checklist: ChecklistItem[] = [];
    for (const rawItem of raw.checklist) {
        const item = parseChecklistItem(rawItem);
        if (!item) return null;
        checklist.push(item);
    }

    return {
        id: raw.id,
        date: raw.date,
        note: raw.note,
        checklist,
        recurrence: isRecurrence(raw.recurrence) ? raw.recurrence : 'none',
        anchor: isValidIsoDate(raw.anchor) ? raw.anchor : raw.date,
        done: raw.done === true,
        rolled: raw.rolled === true,
        updatedAt: typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0,
    };
}

// ---------------------------------------------------------------------------------------------
// Старый формат (файл экспорта прежнего приложения: JSON-массив ITask / ITaskView)

const LEGACY_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

const LEGACY_ROLL_OVER: Record<number, Recurrence> = {
    0: 'none',
    1: 'daily',
    2: 'weekly',
    3: 'monthly',
    30: 'semiannual',
    4: 'yearly',
};

function legacyDate(value: unknown): IsoDate | null {
    if (typeof value !== 'string') return null;
    const match = LEGACY_DATE_RE.exec(value.trim());
    if (!match) return null;

    const iso = toIso(Number(match[3]), Number(match[2]), Number(match[1]));
    return isValidIsoDate(iso) ? iso : null;
}

/** `lastChange` в старом коде — Date.toString(); пробуем разобрать, иначе время неизвестно. */
function legacyTime(value: unknown): string | null {
    if (typeof value !== 'string' || value === '') return null;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

function isLegacyRecord(raw: Record<string, unknown>): boolean {
    return 'checkList' in raw || 'rollOver' in raw || (typeof raw.date === 'string' && LEGACY_DATE_RE.test(raw.date.trim()));
}

export function migrateLegacyTask(raw: unknown, makeId: () => string = newId): Task | null {
    if (!isRecord(raw)) return null;

    const date = legacyDate(raw.date);
    if (!date || typeof raw.note !== 'string') return null;

    const checklist: ChecklistItem[] = [];
    for (const rawItem of Array.isArray(raw.checkList) ? raw.checkList : []) {
        if (!isRecord(rawItem) || typeof rawItem.text !== 'string') return null;
        const done = rawItem.state === true;
        checklist.push({ text: rawItem.text, done, changedAt: done ? legacyTime(rawItem.lastChange) : null });
    }

    const rollOver = typeof raw.rollOver === 'number' ? raw.rollOver : 0;

    return {
        id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : makeId(),
        date,
        note: raw.note,
        checklist,
        recurrence: LEGACY_ROLL_OVER[rollOver] ?? 'none',
        anchor: date,
        done: raw.irrelevant === true,
        rolled: typeof raw.markProc === 'number' && raw.markProc !== 0,
        updatedAt: 0, // чтобы при слиянии записи, уже лежащие в приложении, побеждали
    };
}

// ---------------------------------------------------------------------------------------------
// Экспорт, разбор файла, слияние

export function exportSnapshot(tasks: readonly Task[], now: number): Snapshot {
    return {
        format: SNAPSHOT_FORMAT,
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        exportedAt: now,
        tasks: tasks.map((task) => ({ ...task, checklist: task.checklist.map((item) => ({ ...item })) })),
    };
}

export interface ParsedImport {
    tasks: Task[];
    /** Сколько записей пропущено как непригодные. */
    invalid: number;
}

/**
 * Разбор содержимого файла: снимок приложения (`{ format: 'nextup', tasks }`) или массив из старого приложения.
 * `null` — формат не распознан.
 */
export function parseImport(raw: unknown, makeId: () => string = newId): ParsedImport | null {
    let records: unknown[];

    if (Array.isArray(raw)) records = raw;
    else if (isRecord(raw) && raw.format === SNAPSHOT_FORMAT && Array.isArray(raw.tasks)) records = raw.tasks;
    else return null;

    const tasks: Task[] = [];
    let invalid = 0;

    for (const record of records) {
        const task = isRecord(record) && isLegacyRecord(record) ? migrateLegacyTask(record, makeId) : parseTaskRecord(record);
        if (task) tasks.push(task);
        else invalid++;
    }

    return { tasks, invalid };
}

export type MergeStrategy = 'replace' | 'merge-by-updated-at';

export interface ImportReport {
    added: number;
    updated: number;
    skipped: number;
    invalid: number;
}

/** Слияние по `id`: при совпадении побеждает запись с большим `updatedAt` (при равных остаётся текущая). */
export function mergeTasks(current: readonly Task[], incoming: readonly Task[], strategy: MergeStrategy, invalid = 0): { tasks: Task[]; report: ImportReport } {
    if (strategy === 'replace') {
        return { tasks: [...incoming], report: { added: incoming.length, updated: 0, skipped: 0, invalid } };
    }

    const byId = new Map(current.map((task) => [task.id, task]));
    const report: ImportReport = { added: 0, updated: 0, skipped: 0, invalid };

    for (const task of incoming) {
        const existing = byId.get(task.id);
        if (!existing) {
            byId.set(task.id, task);
            report.added++;
        } else if (task.updatedAt > existing.updatedAt) {
            byId.set(task.id, task);
            report.updated++;
        } else {
            report.skipped++;
        }
    }

    return { tasks: [...byId.values()], report };
}

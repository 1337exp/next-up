import { isValidIsoDate, toIso, type IsoDate } from '../../date';
import { stableId } from '../../id';
import { isRecord, type Step } from './types';

/** Версия 0: JSON-массив из самого первого приложения (`ITask`). Поднимается до v1 — формата прежнего Next Up. */

const LEGACY_DATE_RE = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;

const LEGACY_ROLL_OVER: Record<number, string> = { 0: 'none', 1: 'daily', 2: 'weekly', 3: 'monthly', 30: 'semiannual', 4: 'yearly' };

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

function migrateTask(raw: unknown): Record<string, unknown> | null {
    if (!isRecord(raw)) return null;
    const date = legacyDate(raw.date);
    if (!date || typeof raw.note !== 'string') return null;

    const checklist: { text: string; done: boolean; changedAt: string | null }[] = [];
    for (const item of Array.isArray(raw.checkList) ? raw.checkList : []) {
        if (!isRecord(item) || typeof item.text !== 'string') return null;
        const text = item.text.trim();
        if (text === '') continue;
        const done = item.state === true;
        checklist.push({ text, done, changedAt: done ? legacyTime(item.lastChange) : null });
    }

    const rollOver = typeof raw.rollOver === 'number' ? raw.rollOver : 0;
    return {
        // у записи без id он выводится из содержимого: повторный импорт того же файла её не продублирует
        id: typeof raw.id === 'string' && raw.id !== '' ? raw.id : stableId('legacy', JSON.stringify([date, raw.note, rollOver, checklist.map((i) => i.text)])),
        date,
        note: raw.note,
        checklist,
        recurrence: LEGACY_ROLL_OVER[rollOver] ?? 'none',
        anchor: date,
        done: raw.irrelevant === true,
        rolled: typeof raw.markProc === 'number' && raw.markProc !== 0,
        updatedAt: 0,
    };
}

export const legacyToV1: Step = (doc) => {
    const records = Array.isArray(doc) ? doc : [];
    const tasks: Record<string, unknown>[] = [];
    let invalid = 0;
    for (const record of records) {
        const task = migrateTask(record);
        if (task) tasks.push(task);
        else invalid++;
    }
    return { doc: { format: 'nextup', schemaVersion: 1, exportedAt: 0, tasks }, invalid };
};

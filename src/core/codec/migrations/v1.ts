import { stableId } from '../../id';
import { UNKNOWN_TIME } from '../../model';
import { occurrenceId } from '../../repeat';
import { isRecord, type Step } from './types';

/**
 * Версия 1: прежний Next Up (`{ format: 'nextup', schemaVersion: 1, tasks }`) → версия 2 (`{ app, version: 2, notes }`).
 *
 * Повторы в v1 — копии со случайными id и без номера серии. Чтобы после миграции они не задвоились с повторами v2
 * (у них id `series@date`), серия выводится из содержимого, а id пересчитывается: одна и та же запись на любом
 * устройстве и при любом повторном импорте получает один и тот же id. Серию определяют период и текст: правка текста
 * у одной из копий в прошлом даст отдельную серию, а две разные заметки с одинаковым текстом и периодом сольются.
 */

const UNITS: Record<string, { every: number; unit: string }> = {
    daily: { every: 1, unit: 'day' },
    weekly: { every: 1, unit: 'week' },
    monthly: { every: 1, unit: 'month' },
    semiannual: { every: 6, unit: 'month' },
    yearly: { every: 1, unit: 'year' },
};

function time(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
}

const seriesKey = (recurrence: unknown, note: unknown): string => `${String(recurrence)}|${String(note)}`;

/**
 * Опорная дата серии = самая ранняя среди копий с тем же периодом и текстом. В файлах самого первого приложения
 * у каждой копии `anchor` равен её собственной дате, а в v1 он общий: так оба случая дают одну серию.
 */
function seriesAnchors(tasks: readonly unknown[]): Map<string, string> {
    const anchors = new Map<string, string>();
    for (const task of tasks) {
        if (!isRecord(task) || typeof task.recurrence !== 'string' || !UNITS[task.recurrence] || typeof task.note !== 'string') continue;
        const anchor = typeof task.anchor === 'string' ? task.anchor : task.date;
        if (typeof anchor !== 'string') continue;
        const key = seriesKey(task.recurrence, task.note);
        const known = anchors.get(key);
        if (known === undefined || anchor < known) anchors.set(key, anchor);
    }
    return anchors;
}

function migrateTask(raw: unknown, anchors: ReadonlyMap<string, string>): Record<string, unknown> | null {
    if (!isRecord(raw)) return null;
    if (typeof raw.id !== 'string' || raw.id === '' || typeof raw.date !== 'string' || typeof raw.note !== 'string' || !Array.isArray(raw.checklist)) return null;

    const updatedAt = typeof raw.updatedAt === 'number' && Number.isFinite(raw.updatedAt) ? raw.updatedAt : 0;
    const anchor = anchors.get(seriesKey(raw.recurrence, raw.note)) ?? (typeof raw.anchor === 'string' ? raw.anchor : raw.date);

    const items: Record<string, unknown>[] = [];
    for (const [index, item] of raw.checklist.entries()) {
        if (!isRecord(item) || typeof item.text !== 'string') return null;
        const text = item.text.trim();
        if (text === '') continue;
        const done = item.done === true;
        items.push({
            id: stableId('item', `${raw.id}|${index}|${text}`),
            text,
            doneAt: done ? (time(item.changedAt) ?? UNKNOWN_TIME) : null,
        });
    }

    const rule = typeof raw.recurrence === 'string' ? UNITS[raw.recurrence] : undefined;
    let id = raw.id;
    let repeat: Record<string, unknown> | null = null;
    if (rule) {
        const series = stableId('series', `${anchor}|${raw.recurrence}|${raw.note}`);
        id = occurrenceId(series, raw.date);
        repeat = { ...rule, series, anchor };
    }

    return {
        id,
        due: raw.date,
        body: raw.note,
        items,
        repeat,
        doneAt: raw.done === true ? updatedAt || UNKNOWN_TIME : null,
        createdAt: updatedAt,
        updatedAt,
        deletedAt: null,
    };
}

export const v1ToV2: Step = (doc) => {
    const tasks = isRecord(doc) && Array.isArray(doc.tasks) ? doc.tasks : [];
    const byId = new Map<string, Record<string, unknown>>();
    const anchors = seriesAnchors(tasks);
    let invalid = 0;

    for (const task of tasks) {
        const note = migrateTask(task, anchors);
        if (!note) {
            invalid++;
            continue;
        }
        const known = byId.get(note.id as string);
        // одинаковый id после пересчёта: остаётся запись с большим updatedAt
        if (!known || (note.updatedAt as number) > (known.updatedAt as number)) byId.set(note.id as string, note);
    }

    const exportedAt = isRecord(doc) && typeof doc.exportedAt === 'number' ? doc.exportedAt : 0;
    return { doc: { app: 'nextup', version: 2, exportedAt, notes: [...byId.values()] }, invalid };
};

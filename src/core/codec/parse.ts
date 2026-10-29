import { isValidIsoDate } from '../date';
import { MAX_REPEAT_EVERY, isRepeatUnit, type Item, type Note, type Repeat } from '../model';
import { isRecord } from './migrations/types';

const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const timeOrNull = (value: unknown): number | null => (isTime(value) ? value : null);

function parseItem(raw: unknown): Item | null {
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '' || typeof raw.text !== 'string') return null;
    return { id: raw.id, text: raw.text.trim(), doneAt: timeOrNull(raw.doneAt) };
}

function parseRepeat(raw: unknown): Repeat | null | undefined {
    if (raw === null || raw === undefined) return null;
    if (!isRecord(raw)) return undefined;
    if (typeof raw.series !== 'string' || raw.series === '' || !isValidIsoDate(raw.anchor)) return undefined;
    if (!isRepeatUnit(raw.unit) || !Number.isInteger(raw.every) || (raw.every as number) < 1 || (raw.every as number) > MAX_REPEAT_EVERY) return undefined;
    return { series: raw.series, anchor: raw.anchor, every: raw.every as number, unit: raw.unit };
}

/** Запись версии 2. Любая непригодная запись даёт `null`, а не исключение. */
export function parseNote(raw: unknown): Note | null {
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id === '') return null;
    if (!isValidIsoDate(raw.due) || typeof raw.body !== 'string' || !Array.isArray(raw.items)) return null;

    const items: Item[] = [];
    for (const rawItem of raw.items) {
        const item = parseItem(rawItem);
        if (!item) return null;
        if (item.text !== '') items.push(item);
    }

    const repeat = parseRepeat(raw.repeat);
    if (repeat === undefined) return null;

    const updatedAt = isTime(raw.updatedAt) ? raw.updatedAt : 0;
    return {
        id: raw.id,
        due: raw.due,
        body: raw.body,
        items,
        repeat,
        doneAt: timeOrNull(raw.doneAt),
        createdAt: isTime(raw.createdAt) ? raw.createdAt : updatedAt,
        updatedAt,
        deletedAt: timeOrNull(raw.deletedAt),
    };
}

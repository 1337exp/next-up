import { RETENTION_DAYS } from './constants';
import { diffDays, isValidIsoDate, type IsoDate } from './date';
import { newId } from './id';
import { MAX_REPEAT_EVERY, isRepeatUnit, type Item, type Note, type NoteInput, type RepeatRule } from './model';

export type NoteError = 'badDate' | 'empty' | 'tooOld' | 'badRepeat';
export type NoteResult = { ok: true; note: Note } | { ok: false; error: NoteError };

function cleanItems(items: readonly Item[]): Item[] {
    return items.map((item) => ({ id: item.id, text: item.text.trim(), doneAt: item.doneAt })).filter((item) => item.text !== '');
}

function validRepeat(rule: RepeatRule | null): boolean {
    return rule === null || (isRepeatUnit(rule.unit) && Number.isInteger(rule.every) && rule.every >= 1 && rule.every <= MAX_REPEAT_EVERY);
}

/** Правила редактора: дата обязательна; нужен текст или хотя бы один пункт; срок не старше RETENTION_DAYS. */
export function validateInput(input: NoteInput, today: IsoDate): NoteError | null {
    if (!isValidIsoDate(input.due)) return 'badDate';
    if (input.body.trim() === '' && cleanItems(input.items).length === 0) return 'empty';
    if (diffDays(today, input.due) < -RETENTION_DAYS) return 'tooOld';
    if (!validRepeat(input.repeat)) return 'badRepeat';
    return null;
}

export function createNote(input: NoteInput, today: IsoDate, now: number, id: string = newId()): NoteResult {
    const error = validateInput(input, today);
    if (error) return { ok: false, error };

    return {
        ok: true,
        note: {
            id,
            due: input.due,
            body: input.body.trim(),
            items: cleanItems(input.items),
            repeat: input.repeat ? { ...input.repeat, series: id, anchor: input.due } : null,
            doneAt: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        },
    };
}

/** Изменение заметки. Если сменились срок или правило повтора, серия начинается заново от новой даты. */
export function updateNote(note: Note, input: NoteInput, today: IsoDate, now: number): NoteResult {
    const error = validateInput(input, today);
    if (error) return { ok: false, error };

    const sameRule = note.repeat?.every === input.repeat?.every && note.repeat?.unit === input.repeat?.unit;
    const keepSeries = note.repeat !== null && input.repeat !== null && sameRule && input.due === note.due;

    return {
        ok: true,
        note: {
            ...note,
            due: input.due,
            body: input.body.trim(),
            items: cleanItems(input.items),
            repeat: input.repeat ? (keepSeries ? note.repeat : { ...input.repeat, series: note.id, anchor: input.due }) : null,
            updatedAt: now,
        },
    };
}

/** Данные для «клонировать»: срок, текст и пункты без отметок; повтор не копируется. */
export function cloneInput(note: Note): NoteInput {
    return {
        due: note.due,
        body: note.body,
        items: note.items.map((item) => ({ id: newId(), text: item.text, doneAt: null })),
        repeat: null,
    };
}

export function setDone(note: Note, done: boolean, now: number): Note {
    return { ...note, doneAt: done ? now : null, updatedAt: now };
}

/** Отметка пункта: время ставится при отметке и сбрасывается при снятии. */
export function toggleItem(note: Note, itemId: string, now: number): Note {
    if (!note.items.some((item) => item.id === itemId)) return note;
    return { ...note, items: note.items.map((item) => (item.id === itemId ? { ...item, doneAt: item.doneAt === null ? now : null } : item)), updatedAt: now };
}

export function removeNote(note: Note, now: number): Note {
    return { ...note, deletedAt: now, updatedAt: now };
}

export function restoreNote(note: Note, now: number): Note {
    return { ...note, deletedAt: null, updatedAt: now };
}

/** Короткое название для вопросов и уведомлений: начало текста или первый пункт, не длиннее `limit`. */
export function noteTitle(note: Pick<Note, 'body' | 'items'>, limit = 50): string {
    const source = note.body !== '' ? note.body : (note.items[0]?.text ?? '');
    return source.length > limit ? `${source.slice(0, limit)} ...` : source;
}

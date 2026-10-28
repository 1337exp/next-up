import type { IsoDate } from './date';

export const REPEAT_UNITS = ['day', 'week', 'month', 'year'] as const;
export type RepeatUnit = (typeof REPEAT_UNITS)[number];

export function isRepeatUnit(value: unknown): value is RepeatUnit {
    return typeof value === 'string' && (REPEAT_UNITS as readonly string[]).includes(value);
}

export const MAX_REPEAT_EVERY = 99;

/** Правило повтора без привязки к серии: то, что вводит пользователь. */
export interface RepeatRule {
    every: number;
    unit: RepeatUnit;
}

/** Правило серии. У каждого повтора серии то же `series` и `anchor`; id повтора — `${series}@${due}`. */
export interface Repeat extends RepeatRule {
    series: string;
    /** Опорная дата серии: повтор n = anchor + n периодов. */
    anchor: IsoDate;
}

/** Пункт списка. «Отмечен» = `doneAt !== null`; время неизвестно — `UNKNOWN_TIME`. */
export interface Item {
    id: string;
    text: string;
    doneAt: number | null;
}

/** Отметка есть, а когда она сделана — неизвестно (данные из старых версий). Интерфейс время не показывает. */
export const UNKNOWN_TIME = 1;

export interface Note {
    id: string;
    /** Срок: календарный день. */
    due: IsoDate;
    /** Текст в Markdown. */
    body: string;
    items: Item[];
    repeat: Repeat | null;
    /** Завершена до срока: когда. */
    doneAt: number | null;
    createdAt: number;
    /** Время последнего изменения, мс: по нему слияние выбирает победителя. */
    updatedAt: number;
    /** Удалена (надгробие = корзина = безопасное удаление при синхронизации). */
    deletedAt: number | null;
}

/** Данные редактора. */
export interface NoteInput {
    due: IsoDate;
    body: string;
    items: Item[];
    repeat: RepeatRule | null;
}

export const SNAPSHOT_APP = 'nextup';
export const SNAPSHOT_VERSION = 2;

/** Единый формат обмена: файл, хранилище, сервер. */
export interface Snapshot {
    app: typeof SNAPSHOT_APP;
    version: typeof SNAPSHOT_VERSION;
    exportedAt: number;
    notes: Note[];
}

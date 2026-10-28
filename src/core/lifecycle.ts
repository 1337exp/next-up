import { FAR_DAYS, MS_PER_DAY, RETENTION_DAYS, RUN_MIN, SOON_DAYS, TOMBSTONE_DAYS, TRASH_DAYS } from './constants';
import { addDays, diffDays, isoParts, monthKey, quarterOf, type IsoDate } from './date';
import type { Note } from './model';
import { nextOccurrence, occurrenceId } from './repeat';

/** Дней до срока: 0 — сегодня, отрицательное — срок прошёл. */
export function daysLeft(note: Pick<Note, 'due'>, today: IsoDate): number {
    return diffDays(today, note.due);
}

/** Архив: срок прошёл или заметка завершена до срока. Заметка на сегодня ещё активна. */
export function isArchived(note: Pick<Note, 'due' | 'doneAt'>, today: IsoDate): boolean {
    return note.doneAt !== null || daysLeft(note, today) < 0;
}

const byDue = (a: Note, b: Note): number => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function isLive(note: Pick<Note, 'deletedAt'>): boolean {
    return note.deletedAt === null;
}

/** Активные: ближайшие сверху. Архив: свежие сверху. Удалённые не входят ни туда, ни туда. */
export function splitNotes(notes: readonly Note[], today: IsoDate): { active: Note[]; archive: Note[] } {
    const live = notes.filter(isLive).sort(byDue);
    return {
        active: live.filter((n) => !isArchived(n, today)),
        archive: live.filter((n) => isArchived(n, today)).reverse(),
    };
}

/** Удалена навсегда: в корзине уже не видна, остаётся только надгробием. */
export function isPurged(note: Pick<Note, 'deletedAt'>, now: number): boolean {
    return note.deletedAt !== null && now - note.deletedAt >= TRASH_DAYS * MS_PER_DAY;
}

/** Корзина: удалённые не больше `TRASH_DAYS` дней назад, свежие сверху. */
export function trashed(notes: readonly Note[], now: number): Note[] {
    return notes
        .filter((n) => n.deletedAt !== null && now - n.deletedAt < TRASH_DAYS * MS_PER_DAY)
        .sort((a, b) => b.deletedAt! - a.deletedAt!);
}

export interface MonthGroup<T> {
    /** 'YYYY-MM': год входит в ключ, январь 2026 и январь 2027 не сливаются. */
    key: string;
    year: number;
    month: number;
    quarter: number;
    items: T[];
}

/** Разбивка уже отсортированного списка на группы по месяцам (для разделителей). */
export function groupByMonth<T extends { due: IsoDate }>(list: readonly T[]): MonthGroup<T>[] {
    const groups: MonthGroup<T>[] = [];
    for (const item of list) {
        const key = monthKey(item.due);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
            const { year, month } = isoParts(item.due);
            group = { key, year, month, quarter: quarterOf(item.due), items: [] };
            groups.push(group);
        }
        group.items.push(item);
    }
    return groups;
}

export type Urgency = 'past' | 'today' | 'soon' | 'later';

export function urgency(left: number): Urgency {
    if (left < 0) return 'past';
    if (left === 0) return 'today';
    return left <= SOON_DAYS ? 'soon' : 'later';
}

export function isFar(left: number): boolean {
    return left > FAR_DAYS;
}

export type ArchiveEntry = { kind: 'note'; note: Note } | { kind: 'run'; series: string; notes: Note[] };

/**
 * Подряд идущие архивные записи одной серии (от `RUN_MIN` штук) сворачиваются в одну строку:
 * ежедневная серия иначе даёт до 365 карточек в год. Это только показ, данные не меняются.
 */
export function groupRuns(archive: readonly Note[]): ArchiveEntry[] {
    const result: ArchiveEntry[] = [];
    let i = 0;
    while (i < archive.length) {
        const first = archive[i]!;
        const series = first.repeat?.series;
        let j = i + 1;
        if (series) while (j < archive.length && archive[j]!.repeat?.series === series) j++;

        if (series && j - i >= RUN_MIN) result.push({ kind: 'run', series, notes: archive.slice(i, j) });
        else for (let k = i; k < j; k++) result.push({ kind: 'note', note: archive[k]! });
        i = j;
    }
    return result;
}

/**
 * Приводит список к состоянию «на сегодня». Чистая функция, входной массив не меняется.
 *
 * 1. Для каждой серии берётся самый поздний повтор (удалённый обрывает серию). Если он в архиве
 *    (срок прошёл или завершён до срока), создаются все следующие повторы, пока дата не дойдёт до сегодняшней
 *    или будущей. Пропущенные создаются сразу архивными: по архиву видно, что заметка была в день X.
 *    Id повтора — `series@due`: уже существующий не создаётся, повторный вызов ничего не меняет,
 *    а два устройства получают одни и те же записи. У созданных `updatedAt = 0`: любая правка пользователя сильнее.
 * 2. Живые заметки со сроком старше `RETENTION_DAYS` удаляются (повторы старше этого порога не создаются вовсе),
 *    надгробия старше `TOMBSTONE_DAYS` тоже.
 * 3. Результат отсортирован по сроку. Заметки неизменяемы: существующие возвращаются теми же объектами
 *    (по этому отмена и поиск отличают изменённые от нетронутых).
 */
export function normalize(notes: readonly Note[], today: IsoDate, now: number): Note[] {
    const horizon = addDays(today, -RETENTION_DAYS);
    const ids = new Set(notes.map((n) => n.id));

    const latest = new Map<string, Note>();
    for (const note of notes) {
        const series = note.repeat?.series;
        if (!series) continue;
        const known = latest.get(series);
        if (!known || note.due > known.due) latest.set(series, note);
    }

    const created: Note[] = [];
    for (const note of latest.values()) {
        if (note.deletedAt !== null || !isArchived(note, today)) continue;
        const repeat = note.repeat!;

        // сразу перепрыгиваем туда, где повторы ещё не будут удалены чисткой
        let due = nextOccurrence(repeat, note.due < horizon ? addDays(horizon, -1) : note.due);
        for (;;) {
            const id = occurrenceId(repeat.series, due);
            if (!ids.has(id)) {
                ids.add(id);
                created.push({
                    id,
                    due,
                    body: note.body,
                    items: note.items.map((item) => ({ ...item, doneAt: null })),
                    repeat,
                    doneAt: null,
                    createdAt: 0,
                    updatedAt: 0,
                    deletedAt: null,
                });
            }
            if (due >= today) break;
            due = nextOccurrence(repeat, due);
        }
    }

    const tombstoneHorizon = now - TOMBSTONE_DAYS * MS_PER_DAY;
    return [...notes, ...created]
        .filter((n) => (n.deletedAt === null ? n.due >= horizon : n.deletedAt >= tombstoneHorizon))
        .sort(byDue);
}

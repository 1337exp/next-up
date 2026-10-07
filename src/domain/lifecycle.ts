import { FAR_TASK_DAYS, SOON_DAYS } from './constants';
import { diffDays, isoParts, monthKey, quarterOf, type IsoDate } from './date';
import type { Task } from './types';

/** Дней до срока: 0 — сегодня, отрицательное — срок прошёл. */
export function daysLeft(task: Pick<Task, 'date'>, today: IsoDate): number {
    return diffDays(today, task.date);
}

/** Архив: срок прошёл или задача завершена до срока. Задача на сегодня ещё активна. */
export function isArchived(task: Pick<Task, 'date' | 'done'>, today: IsoDate): boolean {
    return task.done || daysLeft(task, today) < 0;
}

function byDateAscending<T extends Pick<Task, 'date'>>(list: readonly T[]): T[] {
    // сортировка стабильна: при равных датах сохраняется порядок добавления
    return [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Активные: ближайшие сверху. Архив: свежие сверху (как в старом приложении). */
export function splitTasks<T extends Pick<Task, 'date' | 'done'>>(tasks: readonly T[], today: IsoDate): { active: T[]; archive: T[] } {
    const sorted = byDateAscending(tasks);
    return {
        active: sorted.filter((t) => !isArchived(t, today)),
        archive: sorted.filter((t) => isArchived(t, today)).reverse(),
    };
}

export interface MonthGroup<T> {
    /** 'YYYY-MM'; год входит в ключ, поэтому январь 2026 и январь 2027 не сливаются. */
    key: string;
    year: number;
    month: number;
    quarter: number;
    tasks: T[];
}

/** Разбивка уже отсортированного списка на группы по месяцам (для разделителей). */
export function groupByMonth<T extends Pick<Task, 'date'>>(list: readonly T[]): MonthGroup<T>[] {
    const groups: MonthGroup<T>[] = [];
    for (const task of list) {
        const key = monthKey(task.date);
        let group = groups[groups.length - 1];
        if (!group || group.key !== key) {
            const { year, month } = isoParts(task.date);
            group = { key, year, month, quarter: quarterOf(task.date), tasks: [] };
            groups.push(group);
        }
        group.tasks.push(task);
    }
    return groups;
}

export type Urgency = 'past' | 'today' | 'soon' | 'later';

/** Для бейджа срока: сегодня — зелёный, до 7 дней — красный, дальше — нейтральный. */
export function urgency(left: number): Urgency {
    if (left < 0) return 'past';
    if (left === 0) return 'today';
    return left <= SOON_DAYS ? 'soon' : 'later';
}

/** Задача дальше 21 дня: при включённой настройке её содержимое сворачивается. */
export function isFarTask(left: number): boolean {
    return left > FAR_TASK_DAYS;
}

import type { IsoDate } from './date';
import { daysLeft } from './lifecycle';
import { taskTitle } from './tasks';
import type { Task } from './types';

/** Задачи на сегодня для оповещения: сколько их и по строке на каждую. Тот же состав уйдёт и во внешний канал (webhook). */
export interface Digest {
    date: IsoDate;
    count: number;
    lines: string[];
}

/** Невыполненные задачи, срок которых сегодня, в порядке списка. Строка — начало заметки (как в списке), в одну строку. */
export function todayDigest(tasks: readonly Task[], today: IsoDate): Digest {
    const lines = tasks
        .filter((task) => !task.done && daysLeft(task, today) === 0)
        .map((task) => taskTitle(task).replace(/\s+/g, ' ').trim());
    return { date: today, count: lines.length, lines };
}

export interface NoticeInput {
    /** Включено ли оповещение в настройках. */
    enabled: boolean;
    /** Есть ли разрешение браузера. */
    granted: boolean;
    /** Дата, за которую уже обработали оповещение (`''` — ни за какую). */
    lastNotified: string;
    today: IsoDate;
    /** Вкладка скрыта: если пользователь смотрит в приложение, задачи и так перед глазами. */
    hidden: boolean;
}

export interface NoticeDecision {
    /** Запомнить сегодняшнюю дату: за один день оповещение не повторяется. */
    mark: boolean;
    /** Показать оповещение. */
    show: boolean;
}

/**
 * Раз в день, когда сменилась дата. Как в старом приложении, дату запоминаем и тогда, когда показывать нечего
 * (вкладка открыта или разрешения нет): позже в тот же день оповещение уже не нужно.
 */
export function decideTodayNotice({ enabled, granted, lastNotified, today, hidden }: NoticeInput): NoticeDecision {
    if (!enabled || lastNotified === today) return { mark: false, show: false };
    return { mark: true, show: granted && hidden };
}

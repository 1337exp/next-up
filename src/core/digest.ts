import type { IsoDate } from './date';
import type { Note } from './model';
import { noteTitle } from './notes';

/** Заметки на сегодня для оповещения: сколько их и по строке на каждую. */
export interface Digest {
    date: IsoDate;
    count: number;
    lines: string[];
}

/** Живые незавершённые заметки со сроком сегодня, в порядке списка. Строка — начало текста (как в списке), в одну строку. */
export function todayDigest(notes: readonly Note[], today: IsoDate): Digest {
    const lines = notes
        .filter((note) => note.deletedAt === null && note.doneAt === null && note.due === today)
        .map((note) => noteTitle(note).replace(/\s+/g, ' ').trim());
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
    /** Вкладка скрыта: если пользователь смотрит в приложение, заметки и так перед глазами. */
    hidden: boolean;
}

export interface NoticeDecision {
    /** Запомнить сегодняшнюю дату: за один день оповещение не повторяется. */
    mark: boolean;
    /** Показать оповещение. */
    show: boolean;
}

/**
 * Раз в день, когда сменилась дата. Дату запоминаем и тогда, когда показывать нечего (вкладка открыта или разрешения
 * нет): позже в тот же день оповещение уже не нужно.
 */
export function decideTodayNotice({ enabled, granted, lastNotified, today, hidden }: NoticeInput): NoticeDecision {
    if (!enabled || lastNotified === today) return { mark: false, show: false };
    return { mark: true, show: granted && hidden };
}

import { addDays, addMonthsClamped, isValidIsoDate, toIso, weekdayIndex, isoParts, type IsoDate } from './date';
import { MAX_REPEAT_EVERY, type RepeatRule, type RepeatUnit } from './model';

/**
 * Быстрый ввод: «позвонить маме завтра», «в пятницу оплатить интернет», «каждый понедельник планёрка #работа»,
 * «через 2 недели», «5 ноября», «30.10». Найденные слова про срок и повтор вырезаются из текста, остальное — заметка.
 * Понимает русский и английский сразу: языки не пересекаются. Чистая функция, без DOM.
 */
export interface QuickResult {
    /** Текст заметки без слов про срок и повтор (теги `#так` остаются). Если вырезать пришлось всё — исходный текст. */
    body: string;
    /** Срок; без указания — сегодня. */
    due: IsoDate;
    repeat: RepeatRule | null;
    /** Нашлась ли в тексте дата / правило повтора (для подсказки под полем). */
    foundDue: boolean;
    foundRepeat: boolean;
}

const LETTER = '[\\p{L}\\p{N}_]';
/** Слово целиком: кириллица не знает `\b`, поэтому границы — через lookaround. */
const word = (pattern: string): RegExp => new RegExp(`(?<!${LETTER})(?:${pattern})(?!${LETTER})`, 'iu');

const WEEKDAYS: [RegExp, number][] = [
    [/^(понедельник|monday|mon)/i, 0],
    [/^(вторник|tuesday|tue)/i, 1],
    [/^(сред|wednesday|wed)/i, 2],
    [/^(четверг|thursday|thu)/i, 3],
    [/^(пятниц|friday|fri)/i, 4],
    [/^(суббот|saturday|sat)/i, 5],
    [/^(воскресень|sunday|sun)/i, 6],
];
const WEEKDAY_NAMES = 'понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье|monday|tuesday|wednesday|thursday|friday|saturday|sunday';

const MONTHS: [RegExp, number][] = [
    [/^(январ|янв|january|jan)/i, 1],
    [/^(феврал|фев|february|feb)/i, 2],
    [/^(март|мар|march|mar)/i, 3],
    [/^(апрел|апр|april|apr)/i, 4],
    [/^(ма[йя]|may)/i, 5],
    [/^(июн|jun)/i, 6],
    [/^(июл|jul)/i, 7],
    [/^(август|авг|august|aug)/i, 8],
    [/^(сентябр|сен|september|sep)/i, 9],
    [/^(октябр|окт|october|oct)/i, 10],
    [/^(ноябр|ноя|november|nov)/i, 11],
    [/^(декабр|дек|december|dec)/i, 12],
];
const MONTH_NAMES = 'января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря|янв|фев|мар|апр|июн|июл|авг|сен|окт|ноя|дек|january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec';

const UNITS: [RegExp, RepeatUnit][] = [
    [/^(дн|ден|день|day)/i, 'day'],
    [/^(нед|week)/i, 'week'],
    [/^(мес|month)/i, 'month'],
    [/^(год|лет|year)/i, 'year'],
];

function unitOf(text: string): RepeatUnit | null {
    return UNITS.find(([re]) => re.test(text))?.[1] ?? null;
}

const indexOf = (table: [RegExp, number][], text: string): number | null => table.find(([re]) => re.test(text))?.[1] ?? null;

/** Ближайший день недели строго после сегодня: «в пятницу» в пятницу — это следующая пятница. */
function nextWeekday(today: IsoDate, target: number): IsoDate {
    const delta = (target - weekdayIndex(today) + 7) % 7 || 7;
    return addDays(today, delta);
}

function shift(today: IsoDate, every: number, unit: RepeatUnit): IsoDate {
    if (unit === 'day') return addDays(today, every);
    if (unit === 'week') return addDays(today, every * 7);
    return addMonthsClamped(today, unit === 'month' ? every : every * 12);
}

/** День и месяц без года: если дата в этом году уже прошла — берётся следующий год. */
function dayMonth(today: IsoDate, day: number, month: number, year: number | null): IsoDate | null {
    const base = isoParts(today).year;
    const make = (y: number): IsoDate | null => {
        const iso = toIso(y, month, day);
        return isValidIsoDate(iso) ? iso : null;
    };
    if (year !== null) return make(year < 100 ? 2000 + year : year);
    const thisYear = make(base);
    if (thisYear && thisYear >= today) return thisYear;
    return make(base + 1);
}

type Cut = { start: number; end: number };

function cutOut(text: string, cuts: Cut[]): string {
    let out = '';
    let at = 0;
    for (const cut of [...cuts].sort((a, b) => a.start - b.start)) {
        out += text.slice(at, cut.start);
        at = cut.end;
    }
    out += text.slice(at);
    return out.replace(/\s+/g, ' ').replace(/^[\s,;:.\-–—]+|[\s,;:\-–—]+$/g, '').trim();
}

const PREP = '(?:(?:на|к|до|by|for|on)\\s+)?';

export function parseQuick(input: string, today: IsoDate): QuickResult {
    const text = input.trim();
    const cuts: Cut[] = [];
    const take = (match: RegExpExecArray): void => void cuts.push({ start: match.index, end: match.index + match[0].length });

    let repeat: RepeatRule | null = null;
    let due: IsoDate | null = null;

    // --- повтор ---
    // «каждые 2 недели»
    for (const m of text.matchAll(new RegExp(`(?<!${LETTER})(?:каждые|каждый|каждую|every)\\s+(\\d{1,2})\\s+(\\p{L}+)\\.?`, 'giu'))) {
        const unit = unitOf(m[2]!);
        const every = Number(m[1]);
        if (unit && every >= 1 && every <= MAX_REPEAT_EVERY) {
            repeat = { every, unit };
            take(m as RegExpExecArray);
            break;
        }
    }
    // «каждый понедельник» — раз в неделю, начиная с ближайшего такого дня
    if (!repeat) {
        const m = word(`(?:каждый|каждую|every)\\s+(${WEEKDAY_NAMES})`).exec(text);
        const day = m ? indexOf(WEEKDAYS, m[1]!) : null;
        if (m && day !== null) {
            repeat = { every: 1, unit: 'week' };
            due = nextWeekday(today, day);
            take(m);
        }
    }
    // «каждый день / неделю / месяц / год»
    if (!repeat) {
        const m = word('(?:каждый|каждую|каждое|every)\\s+(день|неделю|месяц|год|day|week|month|year)').exec(text);
        const unit = m ? unitOf(m[1]!) : null;
        if (m && unit) {
            repeat = { every: 1, unit };
            take(m);
        }
    }
    // «ежедневно», «weekly» …
    if (!repeat) {
        const m = word('(ежедневно|еженедельно|ежемесячно|ежегодно|daily|weekly|monthly|yearly)').exec(text);
        if (m) {
            repeat = { every: 1, unit: ({ ежедневно: 'day', еженедельно: 'week', ежемесячно: 'month', ежегодно: 'year', daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' } as Record<string, RepeatUnit>)[m[1]!.toLowerCase()]! };
            take(m);
        }
    }

    // --- срок ---
    if (!due) {
        let m: RegExpExecArray | null;
        if ((m = word(`${PREP}послезавтра|day after tomorrow`).exec(text))) {
            due = addDays(today, 2);
            take(m);
        } else if ((m = word(`${PREP}завтра|tomorrow`).exec(text))) {
            due = addDays(today, 1);
            take(m);
        } else if ((m = word(`${PREP}сегодня|today`).exec(text))) {
            due = today;
            take(m);
        }
    }
    // «через 3 дня», «in 2 weeks»; «через неделю»
    if (!due) {
        for (const m of text.matchAll(new RegExp(`(?<!${LETTER})(?:через|in)\\s+(\\d{1,3})\\s+(\\p{L}+)\\.?`, 'giu'))) {
            const unit = unitOf(m[2]!);
            if (unit) {
                due = shift(today, Number(m[1]), unit);
                take(m as RegExpExecArray);
                break;
            }
        }
    }
    if (!due) {
        const m = word('через\\s+(день|неделю|месяц|год)').exec(text);
        const unit = m ? unitOf(m[1]!) : null;
        if (m && unit) {
            due = shift(today, 1, unit);
            take(m);
        }
    }
    // «в пятницу», «on friday»
    if (!due) {
        const m = word(`(?:(?:в|во|on|next)\\s+)(${WEEKDAY_NAMES})|(?:friday|monday|tuesday|wednesday|thursday|saturday|sunday)`).exec(text);
        const day = m ? indexOf(WEEKDAYS, (m[1] ?? m[0])!) : null;
        if (m && day !== null) {
            due = nextWeekday(today, day);
            take(m);
        }
    }
    // «5 ноября», «30 oct», «oct 30»
    if (!due) {
        const dayFirst = word(`${PREP}(\\d{1,2})\\s+(${MONTH_NAMES})\\.?(?:\\s+(\\d{4}))?`).exec(text);
        const monthFirst = dayFirst ? null : word(`(${MONTH_NAMES})\\.?\\s+(\\d{1,2})`).exec(text);
        if (dayFirst) {
            const month = indexOf(MONTHS, dayFirst[2]!);
            const iso = month ? dayMonth(today, Number(dayFirst[1]), month, dayFirst[3] ? Number(dayFirst[3]) : null) : null;
            if (iso) {
                due = iso;
                take(dayFirst);
            }
        } else if (monthFirst) {
            const month = indexOf(MONTHS, monthFirst[1]!);
            const iso = month ? dayMonth(today, Number(monthFirst[2]), month, null) : null;
            if (iso) {
                due = iso;
                take(monthFirst);
            }
        }
    }
    // «30.10», «5.3.27», «30/10/2026»
    if (!due) {
        const m = new RegExp(`(?<![\\d.])${PREP}(\\d{1,2})[./](\\d{1,2})(?:[./](\\d{2}|\\d{4}))?(?![\\d])`, 'iu').exec(text);
        if (m) {
            const iso = dayMonth(today, Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : null);
            if (iso) {
                due = iso;
                take(m);
            }
        }
    }

    const body = cutOut(text, cuts);
    return { body: body === '' ? text : body, due: due ?? today, repeat, foundDue: due !== null, foundRepeat: repeat !== null };
}

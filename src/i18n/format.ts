import type { LocaleCode } from './locales';

export function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Название месяца по номеру 1–12 в именительном падеже: «Январь» / «January». */
export function monthName(locale: LocaleCode, month: number): string {
    // 15-е число: в любом часовом поясе остаёмся внутри месяца
    const name = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2001, month - 1, 15));
    return capitalize(name);
}

/** Короткий день недели: «Чт» / «Thu». */
export function weekdayShort(locale: LocaleCode, iso: string): string {
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    const day = Number(iso.slice(8, 10));
    return capitalize(new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, day)));
}

/** Дата и время отметки (ISO-момент) в часовом поясе пользователя; `timeZone` нужен только тестам. */
export function formatDateTime(isoInstant: string, locale: LocaleCode, timeZone?: string): string {
    const date = new Date(isoInstant);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date);
}

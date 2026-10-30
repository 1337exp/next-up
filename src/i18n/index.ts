import { createI18n } from '@1337exp/taoux/i18n';
import { localeEn, localeRu, setTaoLocale } from '@1337exp/taoui';
import en from './en';
import ru from './ru';

/** Язык определяется по браузеру и запоминается при выборе (`createI18n` из TaoUX); отдельного экрана выбора нет. */
export const i18n = createI18n({ locales: { ru, en }, fallback: 'ru', storageKey: 'nextup.lang' });

export type LocaleCode = (typeof i18n.codes)[number];
export const LOCALE_NAMES: Record<LocaleCode, string> = { ru: 'Русский', en: 'English' };

export const useI18n = i18n.useI18n;

/** Язык приложения и язык компонентов TaoUI (тексты по умолчанию, календарь) меняются вместе. */
export function setLocale(code: LocaleCode): void {
    i18n.setLocale(code);
    setTaoLocale(code === 'ru' ? localeRu : localeEn);
}

export function initLocale(): void {
    const code = i18n.initLocale();
    setTaoLocale(code === 'ru' ? localeRu : localeEn);
}

/** Подпись правила повтора на текущем языке: «Каждый день», «Каждые 3 нед.». */
export function repeatText(repeat: { every: number; unit: 'day' | 'week' | 'month' | 'year' }): string {
    const code = i18n.current.value;
    return repeat.every === 1 ? i18n.translate(code, `repeat.one.${repeat.unit}`) : i18n.translate(code, `repeat.many.${repeat.unit}`, [repeat.every]);
}

/** «через 3 дня» / «in 3 days»: форма по правилам склонения текущего языка. */
export function inDaysText(days: number): string {
    const code = i18n.current.value;
    const form = new Intl.PluralRules(code).select(days);
    // zero и two есть только в других языках (арабский, валлийский): у нас им соответствует «other»
    return i18n.translate(code, `date.inDays.${form === 'one' || form === 'few' || form === 'many' ? form : 'other'}`, [days]);
}

/** «+7 дней» / «+7 days»: сдвиг срока, форма по правилам склонения текущего языка. */
export function plusDaysText(days: number): string {
    const code = i18n.current.value;
    const form = new Intl.PluralRules(code).select(days);
    return i18n.translate(code, `editor.due.plusDays.${form === 'one' || form === 'few' || form === 'many' ? form : 'other'}`, [days]);
}

/** Короткая дата с днём недели без точки после месяца: «пт, 30 окт» / «Fri, Oct 30». */
export function dateShort(locale: string, iso: string): string {
    const [year, month, day] = [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))] as const;
    return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, day)).replace(/\./g, '');
}

function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** Название месяца по номеру 1–12: «Январь» / «January». */
export function monthName(locale: string, month: number): string {
    return capitalize(new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(Date.UTC(2001, month - 1, 15)));
}

/** Короткий день недели: «Чт» / «Thu». */
export function weekdayShort(locale: string, iso: string): string {
    const [year, month, day] = [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))] as const;
    return capitalize(new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, day)));
}

/** Дата для заголовка списка: «Чт, 29 октября» / «Thu, October 29». */
export function dateLong(locale: string, iso: string): string {
    const [year, month, day] = [Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), Number(iso.slice(8, 10))] as const;
    return capitalize(new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.UTC(year, month - 1, day)));
}

/** Время отметки пункта в часовом поясе пользователя. */
export function formatDateTime(ms: number, locale: string): string {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(ms);
}

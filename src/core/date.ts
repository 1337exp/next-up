/**
 * Календарные даты без времени и часового пояса: строка 'YYYY-MM-DD'.
 * Арифметика идёт через UTC и целые номера дней, поэтому переход на летнее время ничего не ломает.
 */
export type IsoDate = string;

const MS_PER_DAY = 86_400_000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_YEAR = 1000;

const pad2 = (n: number) => String(n).padStart(2, '0');

export function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month: 1–12
}

export function isValidIsoDate(value: unknown): value is IsoDate {
    if (typeof value !== 'string') return false;
    const match = ISO_RE.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return year >= MIN_YEAR && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function toIso(year: number, month: number, day: number): IsoDate {
    return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Части корректной даты. Для невалидной строки результат не определён: проверяйте `isValidIsoDate`. */
export function isoParts(iso: IsoDate): { year: number; month: number; day: number } {
    return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)), day: Number(iso.slice(8, 10)) };
}

export function dayNumber(iso: IsoDate): number {
    const { year, month, day } = isoParts(iso);
    return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function fromDayNumber(n: number): IsoDate {
    const d = new Date(n * MS_PER_DAY);
    return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** День недели с понедельника: 0 — пн, 6 — вс. 1 января 1970 было четвергом. */
export function weekdayIndex(iso: IsoDate): number {
    return (((dayNumber(iso) + 3) % 7) + 7) % 7;
}

/** Сколько целых дней от `from` до `to` (отрицательно, если `to` раньше). */
export function diffDays(from: IsoDate, to: IsoDate): number {
    return dayNumber(to) - dayNumber(from);
}

export function addDays(iso: IsoDate, days: number): IsoDate {
    return fromDayNumber(dayNumber(iso) + days);
}

/** Сдвиг на месяцы с прижатием к последнему дню месяца: 31 января + 1 месяц = 28 (29) февраля. */
export function addMonthsClamped(iso: IsoDate, months: number): IsoDate {
    const { year, month, day } = isoParts(iso);
    const total = year * 12 + (month - 1) + months;
    const newYear = Math.floor(total / 12);
    const newMonth = (((total % 12) + 12) % 12) + 1;
    return toIso(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

/** Сегодняшний день по локальному календарю пользователя. */
export function todayIso(now: Date = new Date()): IsoDate {
    return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function monthKey(iso: IsoDate): string {
    return iso.slice(0, 7); // 'YYYY-MM'
}

export function quarterOf(iso: IsoDate): number {
    return Math.floor((isoParts(iso).month - 1) / 3) + 1;
}

/** 'YYYY-MM-DD' → 'dd.mm.yyyy' для поля ввода. */
export function formatUserDate(iso: IsoDate): string {
    const { year, month, day } = isoParts(iso);
    return `${pad2(day)}.${pad2(month)}.${String(year).padStart(4, '0')}`;
}

/**
 * Быстрый ввод даты: `5`, `5.3`, `05.03.2026`, `5/3/26`, `2026-03-05`.
 * Недостающие месяц и год берутся из `today`. Любые нецифровые разделители допустимы.
 * Возвращает `null` для невозможных дат (31.02, месяц 13) — старый код молча переносил их на следующий месяц.
 * Двузначный год понимается как 20xx.
 */
export function parseUserDate(input: string, today: IsoDate): IsoDate | null {
    const parts = input.trim().replace(/\D+/g, '.').replace(/^\.|\.$/g, '').split('.');
    if (parts.length === 0 || parts.length > 3 || parts.some((p) => p === '')) return null;

    const { year: currentYear, month: currentMonth } = isoParts(today);
    let year = currentYear;
    let month = currentMonth;
    let day: number;

    if (parts.length === 3 && parts[0]!.length === 4) {
        [year, month, day] = parts.map(Number) as [number, number, number]; // ISO-порядок: год.месяц.день
    } else {
        day = Number(parts[0]);
        if (parts.length >= 2) month = Number(parts[1]);
        if (parts.length === 3) {
            const raw = parts[2]!;
            if (raw.length === 2) year = 2000 + Number(raw);
            else if (raw.length === 4) year = Number(raw);
            else return null;
        }
    }

    const candidate = toIso(year, month, day);
    return isValidIsoDate(candidate) ? candidate : null;
}

/** Семь дней подряд, начиная с `from`; `offset` — на сколько семидневок сдвинуться (−1 прошлая, 1 следующая). */
export function weekDays(from: IsoDate, offset = 0): IsoDate[] {
    const first = addDays(from, offset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

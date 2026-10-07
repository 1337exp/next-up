import { describe, expect, it } from 'vitest';
import { addDays, addMonthsClamped, diffDays, formatUserDate, isValidIsoDate, monthKey, parseUserDate, quarterOf, todayIso } from '@/domain/date';

describe('isValidIsoDate', () => {
    it('принимает только существующие даты', () => {
        for (const ok of ['2026-10-06', '2024-02-29', '2000-01-01']) expect(isValidIsoDate(ok), ok).toBe(true);
        for (const bad of ['2026-02-29', '2026-13-01', '2026-00-10', '2026-10-32', '20261006', '6.10.2026', '', 5, null]) {
            expect(isValidIsoDate(bad), String(bad)).toBe(false);
        }
    });
});

describe('арифметика дней', () => {
    it('считает целые дни через границу летнего времени', () => {
        // в Europe/Berlin сутки 29.03.2026 длятся 23 часа: старый код давал здесь 0
        expect(diffDays('2026-03-29', '2026-03-30')).toBe(1);
        expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
        expect(diffDays('2026-10-25', '2026-10-26')).toBe(1);
    });

    it('знак: прошедшие даты дают отрицательное число', () => {
        expect(diffDays('2026-10-06', '2026-10-05')).toBe(-1);
        expect(diffDays('2026-10-06', '2026-10-06')).toBe(0);
    });

    it('addDays переходит через месяц и год', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
        expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    });
});

describe('addMonthsClamped', () => {
    it('прижимает день к концу месяца и не «переполняет» в следующий', () => {
        expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28'); // setMonth давал 3 марта
        expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
        expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
        expect(addMonthsClamped('2026-11-30', 3)).toBe('2027-02-28');
        expect(addMonthsClamped('2024-02-29', 12)).toBe('2025-02-28');
    });

    it('работает назад и через год', () => {
        expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28');
        expect(addMonthsClamped('2026-01-15', -2)).toBe('2025-11-15');
        expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15');
    });
});

describe('todayIso', () => {
    it('берёт локальный календарный день, а не UTC', () => {
        expect(todayIso(new Date(2026, 2, 29, 23, 30))).toBe('2026-03-29');
        expect(todayIso(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
    });
});

describe('parseUserDate', () => {
    const today = '2026-10-06';

    it('достраивает месяц и год из «сегодня»', () => {
        expect(parseUserDate('5', today)).toBe('2026-10-05');
        expect(parseUserDate('5.3', today)).toBe('2026-03-05');
        expect(parseUserDate('05.03.2026', today)).toBe('2026-03-05');
    });

    it('понимает любые разделители, пробелы и ISO-порядок', () => {
        expect(parseUserDate('5/3/2026', today)).toBe('2026-03-05');
        expect(parseUserDate(' 7,11 ', today)).toBe('2026-11-07');
        expect(parseUserDate('5-3-26', today)).toBe('2026-03-05');
        expect(parseUserDate('2026-03-05', today)).toBe('2026-03-05');
    });

    it('невозможные и мусорные значения дают null', () => {
        for (const bad of ['', '   ', 'abc', '31.02', '13.13', '0', '32', '1.2.3.4', '5.3.202', '29.02.2026']) {
            expect(parseUserDate(bad, today), bad).toBeNull();
        }
    });

    it('29 февраля допустим только в високосный год', () => {
        expect(parseUserDate('29.02.2028', today)).toBe('2028-02-29');
    });
});

describe('форматирование', () => {
    it('formatUserDate, monthKey, quarterOf', () => {
        expect(formatUserDate('2026-03-05')).toBe('05.03.2026');
        expect(monthKey('2026-03-05')).toBe('2026-03');
        expect([1, 3, 4, 6, 7, 9, 10, 12].map((m) => quarterOf(`2026-${String(m).padStart(2, '0')}-10`))).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    });
});

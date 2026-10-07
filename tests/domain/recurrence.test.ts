import { describe, expect, it } from 'vitest';
import { nextOccurrence, occurrence } from '@/domain/recurrence';
import { addMonthsClamped } from '@/domain/date';

function sequence(anchor: string, rec: Parameters<typeof nextOccurrence>[1], count: number): string[] {
    const out: string[] = [];
    let cur = anchor;
    for (let i = 0; i < count; i++) {
        const next = nextOccurrence(anchor, rec, cur);
        if (!next) break;
        out.push(next);
        cur = next;
    }
    return out;
}

describe('повторы', () => {
    it('daily и weekly', () => {
        expect(sequence('2026-12-30', 'daily', 3)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
        expect(sequence('2026-10-06', 'weekly', 3)).toEqual(['2026-10-13', '2026-10-20', '2026-10-27']);
    });

    it('monthly от 31-го не «съезжает» на 28-е', () => {
        expect(sequence('2026-01-31', 'monthly', 4)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    });

    it('semiannual и yearly, включая 29 февраля', () => {
        expect(sequence('2026-08-31', 'semiannual', 3)).toEqual(['2027-02-28', '2027-08-31', '2028-02-29']);
        expect(sequence('2024-02-29', 'yearly', 5)).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29', '2029-02-28']);
    });

    it('следующий повтор строго позже указанной даты, даже если она не из серии', () => {
        expect(nextOccurrence('2026-01-01', 'weekly', '2026-01-05')).toBe('2026-01-08');
        expect(nextOccurrence('2026-01-01', 'weekly', '2026-01-08')).toBe('2026-01-15');
        expect(nextOccurrence('2026-01-31', 'monthly', '2026-02-28')).toBe('2026-03-31');
    });

    it('дата раньше опорной даёт саму опорную; none — null', () => {
        expect(nextOccurrence('2026-05-10', 'daily', '2026-01-01')).toBe('2026-05-10');
        expect(nextOccurrence('2026-05-10', 'none', '2026-05-10')).toBeNull();
    });

    it('быстро находит повтор через много лет', () => {
        expect(nextOccurrence('2000-01-01', 'daily', '2026-10-06')).toBe('2026-10-07');
        expect(nextOccurrence('2000-01-31', 'monthly', '2026-10-06')).toBe('2026-10-31');
    });

    it('occurrence(n) для месяцев совпадает с addMonthsClamped от опорной даты', () => {
        for (let n = 0; n < 30; n++) expect(occurrence('2026-01-31', 'monthly', n)).toBe(addMonthsClamped('2026-01-31', n));
    });
});

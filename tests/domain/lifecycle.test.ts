import { describe, expect, it } from 'vitest';
import { daysLeft, groupByMonth, isArchived, isFarTask, splitTasks, urgency } from '@/domain/lifecycle';
import { makeTask } from '../helpers';

const today = '2026-10-06';

describe('активные и архив', () => {
    it('задача на сегодня активна, на вчера и завершённая до срока — в архиве', () => {
        expect(isArchived(makeTask({ date: today }), today)).toBe(false);
        expect(isArchived(makeTask({ date: '2026-10-05' }), today)).toBe(true);
        expect(isArchived(makeTask({ date: '2026-10-20', done: true }), today)).toBe(true);
        expect(daysLeft(makeTask({ date: '2026-10-09' }), today)).toBe(3);
    });

    it('активные: ближайшие сверху; архив: свежие сверху', () => {
        const a = makeTask({ id: 'a', date: '2026-10-20' });
        const b = makeTask({ id: 'b', date: '2026-10-07' });
        const c = makeTask({ id: 'c', date: '2026-09-01' });
        const d = makeTask({ id: 'd', date: '2026-10-01' });
        const e = makeTask({ id: 'e', date: '2026-11-01', done: true });

        const { active, archive } = splitTasks([a, b, c, d, e], today);
        expect(active.map((t) => t.id)).toEqual(['b', 'a']);
        expect(archive.map((t) => t.id)).toEqual(['e', 'd', 'c']);
    });

    it('splitTasks не меняет входной массив', () => {
        const list = [makeTask({ date: '2026-10-20' }), makeTask({ date: '2026-10-07' })];
        const before = list.map((t) => t.id);
        splitTasks(list, today);
        expect(list.map((t) => t.id)).toEqual(before);
    });
});

describe('группировка по месяцам', () => {
    it('январь 2026 и январь 2027 — разные группы (в старом коде сливались)', () => {
        const groups = groupByMonth([makeTask({ date: '2026-01-10' }), makeTask({ date: '2026-01-20' }), makeTask({ date: '2027-01-05' })]);
        expect(groups.map((g) => g.key)).toEqual(['2026-01', '2027-01']);
        expect(groups[0]!.tasks).toHaveLength(2);
        expect(groups[0]).toMatchObject({ year: 2026, month: 1, quarter: 1 });
    });

    it('пустой список даёт пустой результат', () => {
        expect(groupByMonth([])).toEqual([]);
    });
});

describe('бейдж срока и сворачивание', () => {
    it('границы: сегодня, 7 дней, 8 дней, прошедшие', () => {
        expect(urgency(-1)).toBe('past');
        expect(urgency(0)).toBe('today');
        expect(urgency(1)).toBe('soon');
        expect(urgency(7)).toBe('soon');
        expect(urgency(8)).toBe('later');
    });

    it('далёкой считается задача дальше 21 дня', () => {
        expect(isFarTask(21)).toBe(false);
        expect(isFarTask(22)).toBe(true);
    });
});

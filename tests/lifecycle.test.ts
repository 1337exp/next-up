import { describe, expect, it } from 'vitest';
import { addDays, weekDays, weekStart } from '@/core/date';
import { bucketOf, groupByBucket, groupByMonth, groupRuns, isArchived, normalize, splitNotes, trashed, urgency } from '@/core/lifecycle';
import { mergeNotes } from '@/core/merge';
import { nextOccurrence, occurrence, occurrenceId } from '@/core/repeat';
import { removeNote, setDone } from '@/core/notes';
import { note, repeat } from './helpers';

const NOW = Date.UTC(2026, 9, 28);

describe('архив и активные', () => {
    it('заметка на сегодня активна, вчерашняя и завершённая — архив', () => {
        const today = '2026-10-10';
        expect(isArchived(note({ id: 'a', due: today }), today)).toBe(false);
        expect(isArchived(note({ id: 'b', due: '2026-10-09' }), today)).toBe(true);
        expect(isArchived(note({ id: 'c', due: '2026-10-20', doneAt: 5 }), today)).toBe(true);
    });

    it('порядок: активные по возрастанию, архив по убыванию; удалённые не показываются', () => {
        const list = [note({ id: '1', due: '2026-10-12' }), note({ id: '2', due: '2026-10-11' }), note({ id: '3', due: '2026-10-01' }), note({ id: '4', due: '2026-10-02' }), note({ id: '5', due: '2026-10-11', deletedAt: 9 })];
        const { active, archive } = splitNotes(list, '2026-10-10');
        expect(active.map((n) => n.id)).toEqual(['2', '1']);
        expect(archive.map((n) => n.id)).toEqual(['4', '3']);
    });

    it('группы по месяцам различают годы', () => {
        const groups = groupByMonth([{ due: '2026-01-05' }, { due: '2026-01-20' }, { due: '2027-01-01' }]);
        expect(groups.map((g) => [g.key, g.items.length, g.quarter])).toEqual([['2026-01', 2, 1], ['2027-01', 1, 1]]);
    });

    it('срочность', () => {
        expect([-1, 0, 7, 8].map(urgency)).toEqual(['past', 'today', 'soon', 'later']);
    });

    it('корзина: свежие сверху, старше 30 дней пропадают', () => {
        const list = [note({ id: 'a', due: '2026-10-01', deletedAt: NOW - 1000 }), note({ id: 'b', due: '2026-10-01', deletedAt: NOW - 40 * 86_400_000 }), note({ id: 'c', due: '2026-10-01' })];
        expect(trashed(list, NOW).map((n) => n.id)).toEqual(['a']);
    });
});

describe('повторы', () => {
    it('месяц считается от опорной даты без дрейфа', () => {
        const r = repeat({ anchor: '2026-01-31', unit: 'month' });
        expect([1, 2, 3].map((n) => occurrence(r, n))).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
        expect(nextOccurrence(r, '2026-02-28')).toBe('2026-03-31');
    });

    it('«каждые 2 недели», «полгода» и год', () => {
        expect(nextOccurrence(repeat({ anchor: '2026-10-01', unit: 'week', every: 2 }), '2026-10-01')).toBe('2026-10-15');
        expect(nextOccurrence(repeat({ anchor: '2026-10-01', unit: 'month', every: 6 }), '2026-10-02')).toBe('2027-04-01');
        expect(nextOccurrence(repeat({ anchor: '2024-02-29', unit: 'year' }), '2024-03-01')).toBe('2025-02-28');
    });

    const series = (due: string, over = {}) => {
        const r = repeat({ series: 'S', anchor: '2026-10-01', unit: 'day' });
        return note({ id: occurrenceId('S', due), due, repeat: r, ...over });
    };

    it('пропущенные повторы создаются архивными, первый будущий — активный', () => {
        const result = normalize([series('2026-10-01')], '2026-10-05', NOW);
        expect(result.map((n) => n.due)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
        expect(result.filter((n) => !isArchived(n, '2026-10-05')).map((n) => n.due)).toEqual(['2026-10-05']);
    });

    it('у созданных повторов чистые пункты и updatedAt = 0', () => {
        const first = series('2026-10-01', { items: [{ id: 'i', text: 'x', doneAt: 5 }] });
        const next = normalize([first], '2026-10-02', NOW)[1]!;
        expect(next.items).toEqual([{ id: 'i', text: 'x', doneAt: null }]);
        expect(next.updatedAt).toBe(0);
    });

    it('идемпотентность: повторный вызов ничего не меняет', () => {
        const once = normalize([series('2026-10-01')], '2026-10-20', NOW);
        expect(normalize(once, '2026-10-20', NOW)).toEqual(once);
    });

    it('«выполнено до срока» создаёт следующий повтор ровно один раз', () => {
        const done = setDone(series('2026-10-10'), true, NOW);
        const once = normalize([done], '2026-10-05', NOW);
        expect(once.map((n) => n.due)).toEqual(['2026-10-10', '2026-10-11']);
        expect(normalize(once, '2026-10-05', NOW)).toHaveLength(2);
    });

    it('удаление последнего повтора обрывает серию', () => {
        const gone = removeNote(series('2026-10-10'), NOW);
        expect(normalize([gone], '2026-10-20', NOW)).toHaveLength(1);
    });

    it('чистка: старше 365 дней удаляется, повторы старше горизонта не создаются', () => {
        const old = series('2024-01-01');
        const result = normalize([old], '2026-10-10', NOW);
        expect(result.every((n) => n.due >= addDays('2026-10-10', -365))).toBe(true);
        expect(result.at(-1)!.due).toBe('2026-10-10');
    });

    it('сходимость: два устройства нормализуют в разное время и сливаются без дублей', () => {
        for (let seed = 1; seed <= 100; seed++) {
            const unit = (['day', 'week', 'month'] as const)[seed % 3]!;
            const anchor = addDays('2026-01-01', (seed * 7) % 200);
            const first = note({ id: occurrenceId('S', anchor), due: anchor, repeat: repeat({ series: 'S', anchor, unit, every: (seed % 3) + 1 }) });
            const a = normalize([first], addDays(anchor, (seed * 13) % 120), NOW);
            const b = normalize([first], addDays(anchor, (seed * 29) % 120), NOW);
            const today = addDays(anchor, 130);
            const left = normalize(mergeNotes(a, b).notes, today, NOW);
            const right = normalize([first], today, NOW);
            expect(left.map((n) => n.id)).toEqual(right.map((n) => n.id));
        }
    });
});

describe('сворачивание серий в архиве', () => {
    it('от трёх подряд идущих записей одной серии', () => {
        const r = repeat({ series: 'S', anchor: '2026-10-01' });
        const mk = (id: string, due: string, withRepeat = true) => note({ id, due, repeat: withRepeat ? r : null });
        const entries = groupRuns([mk('1', '2026-10-05'), mk('2', '2026-10-04'), mk('3', '2026-10-03'), mk('x', '2026-10-02', false), mk('4', '2026-10-01'), mk('5', '2026-09-30')]);
        expect(entries.map((e) => (e.kind === 'run' ? `run${e.notes.length}` : e.note.id))).toEqual(['run3', 'x', '4', '5']);
    });
});

describe('группы по времени', () => {
    // 29 октября 2026 — четверг: «эта неделя» длится до воскресенья 1 ноября
    const today = '2026-10-29';

    it('сегодня, завтра, до воскресенья, позже', () => {
        expect(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'].map((due) => bucketOf(due, today))).toEqual(['today', 'tomorrow', 'week', 'week', 'later']);
    });

    it('в воскресенье «на этой неделе» пусто: после завтра сразу позже', () => {
        expect(['2026-11-01', '2026-11-02', '2026-11-03'].map((due) => bucketOf(due, '2026-11-01'))).toEqual(['today', 'tomorrow', 'later']);
    });

    it('в понедельник неделя длится ещё шесть дней', () => {
        expect(['2026-11-04', '2026-11-08', '2026-11-09'].map((due) => bucketOf(due, '2026-11-02'))).toEqual(['week', 'week', 'later']);
    });

    it('группирует отсортированный список и не создаёт пустых групп', () => {
        const groups = groupByBucket([{ due: '2026-10-29' }, { due: '2026-10-29' }, { due: '2026-10-31' }, { due: '2026-11-10' }], today);
        expect(groups.map((g) => [g.key, g.items.length])).toEqual([['today', 2], ['week', 1], ['later', 1]]);
    });
});

describe('неделя', () => {
    it('семь дней с понедельника той недели, где лежит дата', () => {
        // 29 октября 2026 — четверг
        expect(weekStart('2026-10-29')).toBe('2026-10-26');
        expect(weekStart('2026-11-01')).toBe('2026-10-26'); // воскресенье принадлежит прошлой неделе
        expect(weekStart('2026-10-26')).toBe('2026-10-26');
        expect(weekDays('2026-10-29')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
    });

    it('сдвиг на недели, в том числе через границу месяца и года', () => {
        expect(weekDays('2026-10-29', 1)[0]).toBe('2026-11-02');
        expect(weekDays('2026-10-29', -1)[6]).toBe('2026-10-25');
        expect(weekDays('2026-12-30', 1)).toEqual(['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08', '2027-01-09', '2027-01-10']);
    });
});

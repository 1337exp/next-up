import { describe, expect, it } from 'vitest';
import { normalizeTasks } from '@/domain/normalize';
import { addDays, type IsoDate } from '@/domain/date';
import { RECURRENCES, type Task } from '@/domain/types';
import { idGenerator, makeTask } from '../helpers';

const today = '2026-10-06';
const NOW = 1_000;

const run = (tasks: Task[], day: IsoDate = today) => normalizeTasks(tasks, day, NOW, idGenerator());
const dates = (tasks: Task[]) => tasks.map((t) => t.date);

describe('normalizeTasks: без повторов', () => {
    it('прошедшая задача помечается обработанной, будущая и сегодняшняя не трогаются', () => {
        const past = makeTask({ id: 'past', date: '2026-10-01' });
        const now = makeTask({ id: 'now', date: today });
        const future = makeTask({ id: 'future', date: '2026-10-20' });

        const result = run([future, now, past]);
        expect(result.map((t) => t.id)).toEqual(['past', 'now', 'future']);
        expect(result.find((t) => t.id === 'past')).toMatchObject({ rolled: true, updatedAt: NOW });
        expect(result.find((t) => t.id === 'now')).toMatchObject({ rolled: false, updatedAt: 1 });
        expect(result.find((t) => t.id === 'future')).toMatchObject({ rolled: false, updatedAt: 1 });
    });

    it('не меняет входные данные', () => {
        const input = [makeTask({ date: '2026-09-01', recurrence: 'weekly', checklist: [{ text: 'a', done: true, changedAt: '2026-09-01T10:00:00.000Z' }] })];
        const snapshot = JSON.stringify(input);
        run(input);
        expect(JSON.stringify(input)).toBe(snapshot);
    });
});

describe('normalizeTasks: догон повторов', () => {
    it('еженедельная задача после долгого перерыва: запись на каждый пропущенный раз', () => {
        const result = run([makeTask({ id: 'src', date: '2026-08-01', recurrence: 'weekly' })]);

        expect(dates(result)).toEqual([
            '2026-08-01', '2026-08-08', '2026-08-15', '2026-08-22', '2026-08-29',
            '2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03', '2026-10-10',
        ]);

        const last = result[result.length - 1]!;
        expect(last).toMatchObject({ date: '2026-10-10', rolled: false, done: false }); // единственная активная
        expect(result.slice(0, -1).every((t) => t.rolled)).toBe(true); // пропущенные уже в архиве и обработаны
    });

    it('повтор считается от даты задачи, а не от «сегодня»', () => {
        const result = run([makeTask({ date: '2026-10-01', recurrence: 'weekly' })]);
        expect(dates(result)).toEqual(['2026-10-01', '2026-10-08']);
    });

    it('ежемесячная от 31-го не дрейфует', () => {
        const result = run([makeTask({ date: '2026-01-31', recurrence: 'monthly' })], '2026-05-01');
        expect(dates(result)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31']);
    });

    it('чек-лист копии сброшен, у исходной остаётся как был', () => {
        const checklist = [{ text: 'a', done: true, changedAt: '2026-10-01T10:00:00.000Z' }];
        const result = run([makeTask({ id: 'src', date: '2026-10-01', recurrence: 'weekly', checklist })]);

        expect(result[0]!.checklist).toEqual(checklist);
        expect(result[1]!.checklist).toEqual([{ text: 'a', done: false, changedAt: null }]);
        expect(result[1]!.id).not.toBe('src');
        expect(result[1]!.anchor).toBe('2026-10-01');
    });

    it('«завершена до срока» запускает следующий повтор, и только один раз', () => {
        const first = run([makeTask({ id: 'src', date: '2026-10-20', recurrence: 'monthly', done: true })]);
        expect(first.map((t) => [t.id === 'src', t.date, t.done, t.rolled])).toEqual([
            [true, '2026-10-20', true, true],
            [false, '2026-11-20', false, false],
        ]);

        // вернули в работу — следующий повтор уже существует, второй не создаётся
        const reopened = first.map((t) => (t.id === 'src' ? { ...t, done: false } : t));
        expect(run(reopened)).toHaveLength(2);
    });

    it('повторный запуск ничего не меняет', () => {
        const once = run([makeTask({ date: '2026-08-01', recurrence: 'daily' }), makeTask({ date: '2026-09-01' })]);
        expect(run(once)).toEqual(once);
    });
});

describe('normalizeTasks: чистка', () => {
    it('граница ровно 365 дней: -365 остаётся, -366 удаляется', () => {
        const keep = makeTask({ id: 'keep', date: addDays(today, -365) });
        const drop = makeTask({ id: 'drop', date: addDays(today, -366) });
        expect(run([keep, drop]).map((t) => t.id)).toEqual(['keep']);
    });

    it('повторы старше года не создаются, остаются только свежие', () => {
        const result = run([makeTask({ date: '2020-01-01', recurrence: 'daily' })]);

        expect(result).toHaveLength(366); // от today-365 до today включительно
        expect(result[0]!.date).toBe(addDays(today, -365));
        expect(result[365]).toMatchObject({ date: today, rolled: false });
        expect(result.slice(0, 365).every((t) => t.rolled)).toBe(true);
    });
});

describe('normalizeTasks: догон одним вызовом = прогон по дням', () => {
    function mulberry32(seed: number) {
        return () => {
            seed = (seed + 0x6d2b79f5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // всё, кроме id и updatedAt: они зависят от момента создания
    const signature = (tasks: Task[]) =>
        tasks
            .map(({ id: _id, updatedAt: _updatedAt, ...rest }) => JSON.stringify(rest))
            .sort();

    it('случайные наборы задач и сроки пропуска (300 прогонов)', () => {
        const rnd = mulberry32(2026);
        const pick = <T,>(list: readonly T[]) => list[Math.floor(rnd() * list.length)]!;
        const start: IsoDate = '2026-03-01';

        for (let trial = 0; trial < 300; trial++) {
            const tasks: Task[] = [];
            const count = 1 + Math.floor(rnd() * 5);
            for (let i = 0; i < count; i++) {
                const date = addDays(start, Math.floor(rnd() * 460) - 400);
                tasks.push(makeTask({
                    id: `r${trial}-${i}`,
                    date,
                    note: `n${i}`,
                    recurrence: pick(RECURRENCES),
                    done: rnd() < 0.2,
                    checklist: rnd() < 0.5 ? [{ text: 'x', done: rnd() < 0.5, changedAt: null }] : [],
                }));
            }

            const gap = Math.floor(rnd() * 150);
            const end = addDays(start, gap);

            // A: приложение открывали каждый день
            let stepped = tasks;
            const ids = idGenerator(`a${trial}-`);
            for (let d = 0; d <= gap; d++) stepped = normalizeTasks(stepped, addDays(start, d), d, ids);

            // B: приложение не открывали, догоняем за один вызов
            const jumped = normalizeTasks(tasks, end, 0, idGenerator(`b${trial}-`));

            expect(signature(jumped), `прогон ${trial}, пропуск ${gap} дн.`).toEqual(signature(stepped));
        }
    });
});

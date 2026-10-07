import { describe, expect, it } from 'vitest';
import { exportSnapshot, mergeTasks, migrateLegacyTask, parseImport, parseTaskRecord } from '@/domain/snapshot';
import { normalizeTasks } from '@/domain/normalize';
import { idGenerator, makeTask } from '../helpers';

// Файл экспорта старого приложения: JSON-массив ITaskView (вместе с вычисляемыми полями)
const legacyExport = [
    {
        id: 'old-1',
        date: '05.03.2026',
        note: 'Оплатить интернет',
        checkList: [
            { state: true, text: 'Счёт', lastChange: 'Mon Mar 02 2026 12:00:00 GMT+0000 (Coordinated Universal Time)' },
            { state: false, text: 'Оплата', lastChange: '' },
        ],
        irrelevant: false,
        rollOver: 3,
        markProc: 0,
        daysCountdown: -215,
        changedMonth: true,
    },
    { id: 'old-2', date: '1.1.2027', note: 'Раз в полгода', checkList: [], irrelevant: true, rollOver: 30, markProc: 1, daysCountdown: 87, changedMonth: false },
    { id: 'old-3', date: '15.12.2026', note: 'Без повтора', checkList: [], irrelevant: false, rollOver: 0, markProc: 0 },
    { date: '31.02.2026', note: 'Невозможная дата', checkList: [], irrelevant: false, rollOver: 0, markProc: 0 },
    { id: 'old-5', date: '10.10.2026', checkList: [] }, // нет заметки
    'мусор',
];

describe('импорт файла из старого приложения', () => {
    const parsed = parseImport(legacyExport, idGenerator('gen'))!;

    it('распознаёт формат, считает пропущенные записи', () => {
        expect(parsed.tasks).toHaveLength(3);
        expect(parsed.invalid).toBe(3);
    });

    it('переносит поля: дата в ISO, повтор по коду, irrelevant → done, markProc → rolled', () => {
        const [a, b, c] = parsed.tasks;
        expect(a).toMatchObject({ id: 'old-1', date: '2026-03-05', anchor: '2026-03-05', recurrence: 'monthly', done: false, rolled: false, updatedAt: 0 });
        expect(b).toMatchObject({ id: 'old-2', date: '2027-01-01', recurrence: 'semiannual', done: true, rolled: true });
        expect(c).toMatchObject({ id: 'old-3', recurrence: 'none' });
    });

    it('чек-лист: Date.toString() превращается в ISO-время, у неотмеченных времени нет', () => {
        expect(parsed.tasks[0]!.checklist).toEqual([
            { text: 'Счёт', done: true, changedAt: '2026-03-02T12:00:00.000Z' },
            { text: 'Оплата', done: false, changedAt: null },
        ]);
    });

    it('вычисляемые поля (daysCountdown, changedMonth) не попадают в новые данные', () => {
        expect(JSON.stringify(parsed.tasks)).not.toMatch(/daysCountdown|changedMonth|checkList|rollOver|markProc|irrelevant/);
    });

    it('все коды rollOver старого приложения', () => {
        const codes: Record<number, string> = { 0: 'none', 1: 'daily', 2: 'weekly', 3: 'monthly', 30: 'semiannual', 4: 'yearly', 99: 'none' };
        for (const [code, expected] of Object.entries(codes)) {
            const t = migrateLegacyTask({ id: 'x', date: '01.01.2026', note: 'n', checkList: [], rollOver: Number(code) });
            expect(t?.recurrence, code).toBe(expected);
        }
    });

    it('записи без id получают новый; поля rollOver/markProc могут отсутствовать (самые старые данные)', () => {
        const t = migrateLegacyTask({ date: '01.01.2026', note: 'n', checkList: [], irrelevant: false }, () => 'fresh');
        expect(t).toMatchObject({ id: 'fresh', recurrence: 'none', rolled: false });
    });

    it('после импорта и normalize старые задачи ведут себя как в старом приложении', () => {
        const result = normalizeTasks(parsed.tasks, '2026-10-06', 1, idGenerator('n'));
        const monthly = result.filter((t) => t.note === 'Оплатить интернет');

        // с 05.03 по 05.10 — пропущенные раз в месяц (архив), 05.11 — активная
        expect(monthly.map((t) => t.date)).toEqual([
            '2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05', '2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05',
        ]);
        expect(monthly.filter((t) => !t.rolled)).toHaveLength(1);

        // уже обработанная и завершённая «раз в полгода» новых повторов не плодит
        expect(result.filter((t) => t.note === 'Раз в полгода')).toHaveLength(1);
    });
});

describe('формат приложения', () => {
    it('экспорт → JSON → импорт возвращает те же данные', () => {
        const tasks = [makeTask({ id: 'a', recurrence: 'weekly', checklist: [{ text: 'x', done: true, changedAt: '2026-10-01T00:00:00.000Z' }] }), makeTask({ id: 'b', done: true })];
        const snapshot = exportSnapshot(tasks, 123);
        expect(snapshot).toMatchObject({ format: 'nextup', schemaVersion: 1, exportedAt: 123 });

        const back = parseImport(JSON.parse(JSON.stringify(snapshot)));
        expect(back).toEqual({ tasks, invalid: 0 });
    });

    it('неизвестные форматы не распознаются', () => {
        for (const raw of [null, 5, 'text', {}, { tasks: [] }, { format: 'other', tasks: [] }]) expect(parseImport(raw), JSON.stringify(raw)).toBeNull();
    });

    it('parseTaskRecord: недостающие необязательные поля получают значения по умолчанию', () => {
        expect(parseTaskRecord({ id: 'a', date: '2026-10-06', note: '', checklist: [] })).toEqual({
            id: 'a', date: '2026-10-06', note: '', checklist: [], recurrence: 'none', anchor: '2026-10-06', done: false, rolled: false, updatedAt: 0,
        });
    });

    it('parseTaskRecord: повреждённые записи отбрасываются', () => {
        for (const bad of [null, [], { id: '', date: '2026-10-06', note: '', checklist: [] }, { id: 'a', date: '2026-02-30', note: '', checklist: [] }, { id: 'a', date: '2026-10-06', note: 1, checklist: [] }, { id: 'a', date: '2026-10-06', note: '', checklist: [5] }]) {
            expect(parseTaskRecord(bad), JSON.stringify(bad)).toBeNull();
        }
    });
});

describe('mergeTasks', () => {
    const current = [makeTask({ id: 'a', note: 'cur-a', updatedAt: 10 }), makeTask({ id: 'b', note: 'cur-b', updatedAt: 10 })];

    it('новые добавляются, более свежие заменяют, равные и старые пропускаются', () => {
        const incoming = [
            makeTask({ id: 'a', note: 'new-a', updatedAt: 20 }),
            makeTask({ id: 'b', note: 'new-b', updatedAt: 10 }),
            makeTask({ id: 'c', note: 'new-c', updatedAt: 1 }),
        ];
        const { tasks, report } = mergeTasks(current, incoming, 'merge-by-updated-at', 2);

        expect(report).toEqual({ added: 1, updated: 1, skipped: 1, invalid: 2 });
        expect(Object.fromEntries(tasks.map((t) => [t.id, t.note]))).toEqual({ a: 'new-a', b: 'cur-b', c: 'new-c' });
    });

    it('импорт старых записей (updatedAt 0) не затирает уже лежащие в приложении', () => {
        const { tasks, report } = mergeTasks(current, [makeTask({ id: 'a', note: 'old', updatedAt: 0 })], 'merge-by-updated-at');
        expect(report.skipped).toBe(1);
        expect(tasks.find((t) => t.id === 'a')!.note).toBe('cur-a');
    });

    it('replace полностью заменяет список', () => {
        const { tasks, report } = mergeTasks(current, [makeTask({ id: 'z' })], 'replace');
        expect(tasks.map((t) => t.id)).toEqual(['z']);
        expect(report).toMatchObject({ added: 1 });
    });
});

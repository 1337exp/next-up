import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exportFileName, importFromText, MAX_IMPORT_BYTES, mergeIncoming, serializeExport } from '@/domain/transfer';
import { normalizeTasks } from '@/domain/normalize';
import { splitTasks } from '@/domain/lifecycle';
import { parseImport } from '@/domain/snapshot';
import type { Task } from '@/domain/types';
import { idGenerator, makeTask } from '../helpers';

// Реалистичный экспорт старого приложения (JSON-массив ITaskView), собранный по структуре старого кода:
// цепочки повторов, неотработанные повторы, завершённые до срока, мусорные записи, дубликат id, запись без id.
const legacyText = readFileSync('tests/fixtures/legacy-export.json', 'utf-8');
const today = '2026-10-07';

function importLegacy(current: Task[] = []) {
    const result = importFromText(legacyText, current, today);
    if (!result.ok) throw new Error(`импорт не удался: ${result.error}`);
    return result;
}

const datesOf = (tasks: Task[], note: string) => tasks.filter((t) => t.note === note).map((t) => t.date);

describe('импорт файла старого приложения', () => {
    const { tasks, report } = importLegacy();

    it('отчёт: что добавлено, что пропущено и почему', () => {
        expect(report).toEqual({
            added: 28,
            updated: 0,
            skipped: 1, // запись с повторяющимся id
            invalid: 7, // невозможная дата, заметка не строка, пункт не объект, строка, null, {}, []
            expired: 1, // «Очень старое» (июнь 2025) — чистка удалила бы его сразу
        });
        expect(tasks).toHaveLength(28);
    });

    it('дубликат id: остаётся первая запись', () => {
        expect(tasks.filter((t) => t.id === 'a1-internet0001').map((t) => t.note)).toEqual(['Оплатить интернет']);
    });

    it('чек-лист: пустой пункт отброшен, время отметки из Date.toString() превращено в ISO', () => {
        const shop = tasks.find((t) => t.note.startsWith('**Поход'))!;
        expect(shop.checklist).toEqual([
            { text: 'Хлеб', done: true, changedAt: '2026-09-29T16:42:11.000Z' },
            { text: 'Молоко', done: false, changedAt: null },
            { text: 'Яйца', done: true, changedAt: null }, // «вчера вечером» не разобрать: отметка остаётся, времени нет
        ]);
    });

    it('вычисляемые поля старого приложения не попадают в данные', () => {
        expect(JSON.stringify(tasks)).not.toMatch(/daysCountdown|changedMonth|checkList|rollOver|markProc|irrelevant/);
    });

    it('запись без id получает стабильный id', () => {
        const noId = tasks.find((t) => t.note === 'Без id')!;
        expect(noId.id).toMatch(/^legacy-/);
        expect(importLegacy().tasks.find((t) => t.note === 'Без id')!.id).toBe(noId.id);
    });
});

describe('после импорта и приведения к «сегодня» (7 октября 2026)', () => {
    const imported = importLegacy().tasks;
    const normalized = normalizeTasks(imported, today, 1, idGenerator('n'));
    const { active, archive } = splitTasks(normalized, today);

    it('цепочки повторов из файла продолжаются без дублей и пропусков', () => {
        expect(datesOf(normalized, 'Планёрка')).toEqual(['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08']);
        expect(datesOf(normalized, 'Аренда')).toEqual(['2026-07-05', '2026-08-05', '2026-09-05', '2026-10-05', '2026-11-05']);
        expect(datesOf(normalized, 'Таблетки')).toEqual([
            '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
        ]);
    });

    it('неотработанный повтор (приложение не открывали) догоняется по неделям', () => {
        expect(datesOf(normalized, 'Полив цветов')).toEqual(['2026-09-10', '2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08']);
    });

    it('31-е число не «съезжает»: старый setMonth дал бы 1 октября', () => {
        expect(datesOf(normalized, 'Платёж 31-го')).toEqual(['2026-08-31', '2026-09-30', '2026-10-31']);
    });

    it('завершённая до срока задача не создаёт повтор второй раз', () => {
        expect(datesOf(normalized, 'Сдать отчёт')).toEqual(['2026-10-20', '2026-11-20']);
        expect(normalized.find((t) => t.date === '2026-10-20')).toMatchObject({ done: true, rolled: true });
    });

    it('очень старая задача не попала в список', () => {
        expect(normalized.some((t) => t.note === 'Очень старое')).toBe(false);
    });

    it('итог: на сегодня активных 13, в архиве 29', () => {
        expect(normalized).toHaveLength(42);
        expect(active).toHaveLength(13);
        expect(archive).toHaveLength(29);
    });

    it('повторное приведение ничего не меняет', () => {
        expect(normalizeTasks(normalized, today, 2, idGenerator('m'))).toEqual(normalized);
    });
});

describe('повторный импорт того же файла', () => {
    it('ничего не дублирует: ни обычные записи, ни запись без id, ни продолжения цепочек', () => {
        const first = importLegacy();
        const normalized = normalizeTasks(first.tasks, today, 1, idGenerator('n'));

        const second = importLegacy(normalized);
        expect(second.report).toMatchObject({ added: 0, updated: 0, skipped: 29, invalid: 7, expired: 1 });
        expect(second.tasks).toHaveLength(normalized.length);

        // и после повторного приведения число задач то же: уже обработанные записи не «оживают»
        expect(normalizeTasks(second.tasks, today, 3, idGenerator('k'))).toHaveLength(normalized.length);
    });
});

describe('файл этого приложения', () => {
    const tasks = [
        makeTask({ id: 'a', date: '2026-10-20', note: 'a', recurrence: 'weekly', updatedAt: 5 }),
        makeTask({ id: 'b', date: '2026-10-08', note: 'b', done: true, rolled: true, checklist: [{ text: 'x', done: true, changedAt: '2026-10-01T00:00:00.000Z' }], updatedAt: 6 }),
    ];

    it('экспорт → импорт в пустое приложение возвращает те же задачи', () => {
        const result = importFromText(serializeExport(tasks, 100), [], today);
        expect(result).toEqual({ ok: true, tasks, report: { added: 2, updated: 0, skipped: 0, invalid: 0, expired: 0 } });
    });

    it('импорт в приложение с более новыми правками не затирает их, старые обновляет', () => {
        const current = [{ ...tasks[0]!, note: 'правка на этом устройстве', updatedAt: 50 }, { ...tasks[1]!, updatedAt: 1 }];
        const result = importFromText(serializeExport(tasks, 100), current, today);

        expect(result.ok && result.report).toMatchObject({ added: 0, updated: 1, skipped: 1 });
        expect(result.ok && result.tasks.find((t) => t.id === 'a')!.note).toBe('правка на этом устройстве');
        expect(result.ok && result.tasks.find((t) => t.id === 'b')!.updatedAt).toBe(6);
    });

    it('записи старше года не импортируются и учитываются в отчёте', () => {
        const old = makeTask({ id: 'old', date: '2025-01-01' });
        const result = importFromText(serializeExport([old, ...tasks], 100), [], today);
        expect(result.ok && result.report).toMatchObject({ added: 2, expired: 1 });
        expect(result.ok && result.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    });

    it('имя файла содержит дату', () => {
        expect(exportFileName('2026-10-07')).toBe('nextup-2026-10-07.json');
    });
});

describe('ошибки', () => {
    it('не JSON', () => {
        expect(importFromText('это не json', [], today)).toEqual({ ok: false, error: 'notJson' });
        expect(importFromText('', [], today)).toEqual({ ok: false, error: 'notJson' });
    });

    it('JSON неизвестной формы', () => {
        for (const text of ['null', '42', '"текст"', '{"a":1}', '{"format":"other","tasks":[]}']) {
            expect(importFromText(text, [], today), text).toEqual({ ok: false, error: 'unknownFormat' });
        }
    });

    it('слишком большой файл не разбирается', () => {
        expect(importFromText('x'.repeat(MAX_IMPORT_BYTES + 1), [], today)).toEqual({ ok: false, error: 'tooLarge' });
    });

    it('пустой массив — не ошибка, просто ничего не добавлено', () => {
        expect(importFromText('[]', [], today)).toEqual({ ok: true, tasks: [], report: { added: 0, updated: 0, skipped: 0, invalid: 0, expired: 0 } });
    });

    it('при ошибке текущий список не меняется (функция чистая)', () => {
        const current = [makeTask({ id: 'keep' })];
        importFromText('мусор', current, today);
        expect(current).toHaveLength(1);
    });
});

describe('mergeIncoming', () => {
    it('стратегия replace заменяет весь список, но старше года всё равно не берёт', () => {
        const parsed = parseImport([makeTask({ id: 'new', date: '2026-10-20' }), makeTask({ id: 'old', date: '2024-01-01' })].map((t) => ({ ...t })).map((t) => t))!;
        const { tasks, report } = mergeIncoming([makeTask({ id: 'gone' })], { tasks: parsed.tasks, invalid: 0 }, today, 'replace');
        expect(tasks.map((t) => t.id)).toEqual(['new']);
        expect(report.expired).toBe(1);
    });
});

import { describe, expect, it } from 'vitest';
import { QUICK_SHIFT_DAYS, draftFromClone, draftFromTask, draftToInput, newDraft, normalizeDateText, shiftDateText, withNewItem } from '@/domain/draft';
import { makeTask } from './helpers';

const today = '2026-10-06';

describe('черновик формы', () => {
    it('новая задача: сегодняшняя дата, всё остальное пусто', () => {
        expect(newDraft(today)).toEqual({ dateText: '06.10.2026', note: '', checklist: [], recurrence: 'none' });
    });

    it('изменение: данные задачи вместе с отметками, но копии, а не ссылки', () => {
        const task = makeTask({ date: '2026-11-03', note: 'n', recurrence: 'monthly', checklist: [{ text: 'a', done: true, changedAt: '2026-10-01T10:00:00.000Z' }] });
        const draft = draftFromTask(task);

        expect(draft).toEqual({ dateText: '03.11.2026', note: 'n', recurrence: 'monthly', checklist: task.checklist });
        draft.checklist[0]!.text = 'changed';
        expect(task.checklist[0]!.text).toBe('a');
    });

    it('клонирование: пункты без отметок, повтор не копируется, дата та же', () => {
        const task = makeTask({ date: '2026-11-03', note: 'n', recurrence: 'weekly', checklist: [{ text: 'a', done: true, changedAt: '2026-10-01T10:00:00.000Z' }] });
        expect(draftFromClone(task)).toEqual({ dateText: '03.11.2026', note: 'n', recurrence: 'none', checklist: [{ text: 'a', done: false, changedAt: null }] });
    });
});

describe('поле даты', () => {
    it('кнопки ±1 день, в том числе через границу месяца и года', () => {
        expect(shiftDateText('06.10.2026', 1, today)).toBe('07.10.2026');
        expect(shiftDateText('01.03.2026', -1, today)).toBe('28.02.2026');
        expect(shiftDateText('31.12.2026', 1, today)).toBe('01.01.2027');
    });

    it('быстрые сдвиги: неделя, месяц, полгода', () => {
        expect(QUICK_SHIFT_DAYS).toEqual([7, 30, 180]);
        expect(shiftDateText('06.10.2026', 7, today)).toBe('13.10.2026');
        expect(shiftDateText('06.10.2026', 30, today)).toBe('05.11.2026');
        expect(shiftDateText('06.10.2026', 180, today)).toBe('04.04.2027');
    });

    it('понимает быстрый ввод и при мусоре отсчитывает от сегодняшнего дня', () => {
        expect(shiftDateText('9', 1, today)).toBe('10.10.2026');
        expect(shiftDateText('abc', 1, today)).toBe('07.10.2026');
        expect(shiftDateText('', -1, today)).toBe('05.10.2026');
    });

    it('нормализация: быстрый ввод превращается в полную дату, непонятное остаётся как есть', () => {
        expect(normalizeDateText('5', today)).toBe('05.10.2026');
        expect(normalizeDateText('5.3', today)).toBe('05.03.2026');
        expect(normalizeDateText('abc', today)).toBe('abc');
        expect(normalizeDateText('31.02', today)).toBe('31.02');
    });
});

describe('пункты списка', () => {
    it('новый пункт встаёт в начало, текст обрезается, пустой ничего не добавляет', () => {
        const items = [{ text: 'old', done: false, changedAt: null }];
        expect(withNewItem(items, '  new ').map((i) => i.text)).toEqual(['new', 'old']);
        expect(withNewItem(items, '   ')).toEqual(items);
        expect(withNewItem(items, '   ')).not.toBe(items);
    });
});

describe('черновик → данные задачи', () => {
    it('разбирает дату', () => {
        const result = draftToInput({ dateText: '8.10', note: 'n', checklist: [], recurrence: 'daily' }, today);
        expect(result).toEqual({ ok: true, input: { date: '2026-10-08', note: 'n', checklist: [], recurrence: 'daily' } });
    });

    it('плохая дата — ошибка badDate', () => {
        expect(draftToInput({ dateText: 'abc', note: 'n', checklist: [], recurrence: 'none' }, today)).toEqual({ ok: false, error: 'badDate' });
        expect(draftToInput({ dateText: '31.02.2026', note: 'n', checklist: [], recurrence: 'none' }, today)).toEqual({ ok: false, error: 'badDate' });
    });
});

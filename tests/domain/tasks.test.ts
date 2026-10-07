import { describe, expect, it } from 'vitest';
import { cloneInput, createTask, setDone, taskTitle, toggleChecklistItem, updateTask } from '@/domain/tasks';
import { addDays } from '@/domain/date';
import type { TaskInput } from '@/domain/types';
import { makeTask } from '../helpers';

const today = '2026-10-06';
const base: TaskInput = { date: '2026-10-10', note: '  Купить хлеб  ', checklist: [], recurrence: 'none' };

describe('createTask', () => {
    it('создаёт задачу: заметка обрезана, опорная дата = дата, ничего не завершено', () => {
        const r = createTask(base, today, 5, 'id1');
        expect(r).toEqual({
            ok: true,
            task: { id: 'id1', date: '2026-10-10', note: 'Купить хлеб', checklist: [], recurrence: 'none', anchor: '2026-10-10', done: false, rolled: false, updatedAt: 5 },
        });
    });

    it('пустые пункты чек-листа отбрасываются; чек-лист без заметки допустим', () => {
        const r = createTask({ ...base, note: ' ', checklist: [{ text: ' a ', done: false, changedAt: null }, { text: '  ', done: false, changedAt: null }] }, today, 1);
        expect(r.ok && r.task.checklist).toEqual([{ text: 'a', done: false, changedAt: null }]);
    });

    it('отказывает: без заметки и пунктов, с плохой датой, со слишком старой датой', () => {
        expect(createTask({ ...base, note: '' }, today, 1)).toEqual({ ok: false, error: 'empty' });
        expect(createTask({ ...base, date: '2026-02-30' }, today, 1)).toEqual({ ok: false, error: 'badDate' });
        expect(createTask({ ...base, date: addDays(today, -366) }, today, 1)).toEqual({ ok: false, error: 'tooOld' });
        expect(createTask({ ...base, date: addDays(today, -365) }, today, 1).ok).toBe(true);
    });
});

describe('updateTask', () => {
    const task = makeTask({ date: '2026-10-10', anchor: '2026-09-10', recurrence: 'monthly', note: 'a' });
    const same: TaskInput = { date: '2026-10-10', note: 'b', checklist: [], recurrence: 'monthly' };

    it('если дата и повтор не менялись, серия остаётся прежней', () => {
        const r = updateTask(task, same, today, 9);
        expect(r.ok && r.task).toMatchObject({ note: 'b', anchor: '2026-09-10', updatedAt: 9 });
    });

    it('смена даты или повтора начинает серию заново', () => {
        const moved = updateTask(task, { ...same, date: '2026-10-15' }, today, 9);
        expect(moved.ok && moved.task.anchor).toBe('2026-10-15');
        const changed = updateTask(task, { ...same, recurrence: 'weekly' }, today, 9);
        expect(changed.ok && changed.task.anchor).toBe('2026-10-10');
    });

    it('не трогает id, done и rolled; применяет те же проверки', () => {
        const r = updateTask({ ...task, done: true, rolled: true }, same, today, 9);
        expect(r.ok && r.task).toMatchObject({ id: task.id, done: true, rolled: true });
        expect(updateTask(task, { ...same, note: '' }, today, 9)).toEqual({ ok: false, error: 'empty' });
    });
});

describe('остальные операции', () => {
    it('cloneInput: чек-лист без отметок, повтор не копируется', () => {
        const t = makeTask({ recurrence: 'weekly', checklist: [{ text: 'a', done: true, changedAt: '2026-10-01T10:00:00.000Z' }] });
        expect(cloneInput(t)).toEqual({ date: t.date, note: t.note, checklist: [{ text: 'a', done: false, changedAt: null }], recurrence: 'none' });
    });

    it('setDone меняет флаг и updatedAt', () => {
        expect(setDone(makeTask(), true, 7)).toMatchObject({ done: true, updatedAt: 7 });
    });

    it('toggleChecklistItem ставит время при отметке и снимает при отмене', () => {
        const t = makeTask({ checklist: [{ text: 'a', done: false, changedAt: null }, { text: 'b', done: false, changedAt: null }] });
        const on = toggleChecklistItem(t, 1, Date.UTC(2026, 9, 6, 12));
        expect(on.checklist[1]).toEqual({ text: 'b', done: true, changedAt: '2026-10-06T12:00:00.000Z' });
        expect(on.checklist[0]!.done).toBe(false);
        expect(toggleChecklistItem(on, 1, 5).checklist[1]).toEqual({ text: 'b', done: false, changedAt: null });
        expect(toggleChecklistItem(t, 9, 5)).toBe(t); // несуществующий индекс
        expect(t.checklist[1]!.done).toBe(false); // исходный объект не изменён
    });

    it('taskTitle: до 50 символов, затем « ...», запасной вариант — первый пункт', () => {
        expect(taskTitle({ note: 'коротко', checklist: [] })).toBe('коротко');
        expect(taskTitle({ note: 'x'.repeat(60), checklist: [] })).toBe(`${'x'.repeat(50)} ...`);
        expect(taskTitle({ note: 'x'.repeat(50), checklist: [] })).toBe('x'.repeat(50));
        expect(taskTitle({ note: '', checklist: [{ text: 'пункт', done: false, changedAt: null }] })).toBe('пункт');
        expect(taskTitle({ note: '', checklist: [] })).toBe('');
    });
});

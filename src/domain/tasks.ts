import { RETENTION_DAYS } from './constants';
import { diffDays, isValidIsoDate, type IsoDate } from './date';
import { newId } from './id';
import type { ChecklistItem, Task, TaskInput } from './types';

export type TaskError = 'badDate' | 'empty' | 'tooOld';
export type TaskResult = { ok: true; task: Task } | { ok: false; error: TaskError };

function cleanChecklist(items: readonly ChecklistItem[]): ChecklistItem[] {
    return items
        .map((item) => ({ text: item.text.trim(), done: item.done, changedAt: item.done ? item.changedAt : null }))
        .filter((item) => item.text !== '');
}

/** Правила формы: дата обязательна; нужна заметка или хотя бы один пункт; не старше RETENTION_DAYS. */
function validate(input: TaskInput, today: IsoDate): TaskError | null {
    if (!isValidIsoDate(input.date)) return 'badDate';
    if (input.note.trim() === '' && cleanChecklist(input.checklist).length === 0) return 'empty';
    if (diffDays(today, input.date) < -RETENTION_DAYS) return 'tooOld';
    return null;
}

export function createTask(input: TaskInput, today: IsoDate, now: number, id: string = newId()): TaskResult {
    const error = validate(input, today);
    if (error) return { ok: false, error };

    return {
        ok: true,
        task: {
            id,
            date: input.date,
            note: input.note.trim(),
            checklist: cleanChecklist(input.checklist),
            recurrence: input.recurrence,
            anchor: input.date,
            done: false,
            rolled: false,
            updatedAt: now,
        },
    };
}

/** Изменение задачи. Если сменились дата или повтор, серия повторов начинается заново от новой даты. */
export function updateTask(task: Task, input: TaskInput, today: IsoDate, now: number): TaskResult {
    const error = validate(input, today);
    if (error) return { ok: false, error };

    const restartSeries = input.date !== task.date || input.recurrence !== task.recurrence;

    return {
        ok: true,
        task: {
            ...task,
            date: input.date,
            note: input.note.trim(),
            checklist: cleanChecklist(input.checklist),
            recurrence: input.recurrence,
            anchor: restartSeries ? input.date : task.anchor,
            updatedAt: now,
        },
    };
}

/** Данные для формы «клонировать»: дата, заметка и чек-лист без отметок; повтор не копируется. */
export function cloneInput(task: Task): TaskInput {
    return {
        date: task.date,
        note: task.note,
        checklist: task.checklist.map((item) => ({ text: item.text, done: false, changedAt: null })),
        recurrence: 'none',
    };
}

/** «Завершить до срока» и «вернуть в работу». */
export function setDone(task: Task, done: boolean, now: number): Task {
    return { ...task, done, updatedAt: now };
}

/** Отметка пункта чек-листа. Время ставится при отметке и сбрасывается при снятии. */
export function toggleChecklistItem(task: Task, index: number, now: number): Task {
    const item = task.checklist[index];
    if (!item) return task;

    const done = !item.done;
    const checklist = task.checklist.map((it, i) => (i === index ? { ...it, done, changedAt: done ? new Date(now).toISOString() : null } : it));
    return { ...task, checklist, updatedAt: now };
}

/** Короткое название для вопроса «удалить запись?»: начало заметки или первый пункт, не длиннее `limit`. */
export function taskTitle(task: Pick<Task, 'note' | 'checklist'>, limit = 50): string {
    const source = task.note !== '' ? task.note : (task.checklist[0]?.text ?? '');
    return source.length > limit ? `${source.slice(0, limit)} ...` : source;
}

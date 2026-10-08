import { addDays, formatUserDate, parseUserDate, type IsoDate } from './date';
import { cloneInput } from './tasks';
import type { ChecklistItem, Recurrence, Task, TaskInput } from './types';

/** Состояние формы: дата хранится как введённый текст (`dd.mm.yyyy`), остальное — как в задаче. */
export interface TaskDraft {
    dateText: string;
    note: string;
    checklist: ChecklistItem[];
    recurrence: Recurrence;
}

/** Кнопки быстрого сдвига даты в форме: неделя, месяц, полгода. */
export const QUICK_SHIFT_DAYS = [7, 30, 180] as const;

const copyItems = (items: readonly ChecklistItem[]): ChecklistItem[] => items.map((item) => ({ ...item }));

/** Новая задача: сегодняшняя дата, всё остальное пусто. */
export function newDraft(today: IsoDate): TaskDraft {
    return { dateText: formatUserDate(today), note: '', checklist: [], recurrence: 'none' };
}

/** Изменение: всё, включая отметки пунктов, остаётся как было. */
export function draftFromTask(task: Task): TaskDraft {
    return { dateText: formatUserDate(task.date), note: task.note, checklist: copyItems(task.checklist), recurrence: task.recurrence };
}

/** Клонирование: дата, заметка и пункты без отметок; повтор не копируется. */
export function draftFromClone(task: Task): TaskDraft {
    const input = cloneInput(task);
    return { dateText: formatUserDate(input.date), note: input.note, checklist: input.checklist, recurrence: input.recurrence };
}

/** Кнопки «день назад / вперёд». Если в поле мусор, отсчёт идёт от сегодняшнего дня. */
export function shiftDateText(dateText: string, days: number, today: IsoDate): string {
    return formatUserDate(addDays(parseUserDate(dateText, today) ?? today, days));
}

/** Быстрый ввод: `5` → `05.10.2026`. Непонятный текст остаётся как есть, чтобы пользователь его увидел и поправил. */
export function normalizeDateText(dateText: string, today: IsoDate): string {
    const iso = parseUserDate(dateText, today);
    return iso ? formatUserDate(iso) : dateText;
}

/** Новый пункт добавляется в начало списка (как в старом приложении). Пустой текст ничего не добавляет. */
export function withNewItem(items: readonly ChecklistItem[], text: string): ChecklistItem[] {
    const trimmed = text.trim();
    return trimmed === '' ? [...items] : [{ text: trimmed, done: false, changedAt: null }, ...items];
}

export type DraftResult = { ok: true; input: TaskInput } | { ok: false; error: 'badDate' };

/** Черновик → данные для создания задачи. Остальные проверки (пустая задача, слишком старая дата) делает `createTask`. */
export function draftToInput(draft: TaskDraft, today: IsoDate): DraftResult {
    const date = parseUserDate(draft.dateText, today);
    if (!date) return { ok: false, error: 'badDate' };

    return { ok: true, input: { date, note: draft.note, checklist: copyItems(draft.checklist), recurrence: draft.recurrence } };
}

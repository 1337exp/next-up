import { RETENTION_DAYS } from './constants';
import { addDays, type IsoDate } from './date';
import { newId } from './id';
import { isArchived } from './lifecycle';
import { nextOccurrence } from './recurrence';
import type { Task } from './types';

function copyTask(task: Task): Task {
    return { ...task, checklist: task.checklist.map((item) => ({ ...item })) };
}

/**
 * Приводит список задач к состоянию «на сегодня». Чистая функция: входной массив не меняется.
 *
 * 1. Каждая задача, ушедшая в архив (срок прошёл или завершена до срока) и ещё не `rolled`, помечается `rolled`.
 * 2. Если у неё есть повтор, создаются все следующие повторы, пока дата не дойдёт до сегодняшней или будущей.
 *    Пропущенные повторы создаются сразу как архивные (`rolled`): история остаётся целой, даже если
 *    приложение не запускалось месяцами. Шаг — повтор, а не календарный день: результат тот же,
 *    что при прогоне по дням, потому что следующий повтор зависит только от правила и даты.
 * 3. Затем удаляются задачи, срок которых старше RETENTION_DAYS. Повторы старше этого порога
 *    не создаются вовсе — чистка всё равно удалила бы их.
 * 4. Результат отсортирован по дате (стабильно). Повторный вызов с тем же `today` ничего не меняет.
 */
export function normalizeTasks(tasks: readonly Task[], today: IsoDate, now: number, makeId: () => string = newId): Task[] {
    const horizon = addDays(today, -RETENTION_DAYS); // даты раньше горизонта удаляются
    const result = tasks.map(copyTask);
    const created: Task[] = [];

    for (const task of result) {
        if (task.rolled || !isArchived(task, today)) continue;

        task.rolled = true;
        task.updatedAt = now;

        // сразу перепрыгиваем туда, где повторы ещё не будут удалены чисткой
        let date = nextOccurrence(task.anchor, task.recurrence, task.date < horizon ? addDays(horizon, -1) : task.date);

        while (date !== null) {
            const missed = date < today;

            created.push({
                ...task,
                id: makeId(),
                date,
                done: false,
                rolled: missed,
                checklist: task.checklist.map((item) => ({ text: item.text, done: false, changedAt: null })),
                updatedAt: now,
            });

            if (!missed) break;
            date = nextOccurrence(task.anchor, task.recurrence, date);
        }
    }

    return [...result, ...created]
        .filter((task) => task.date >= horizon)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

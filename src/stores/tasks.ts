import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { createTodayClock } from '@/composables/today';
import { normalizeTasks } from '@/domain/normalize';
import { splitTasks } from '@/domain/lifecycle';
import { exportSnapshot, parseImport, type ImportReport, type MergeStrategy } from '@/domain/snapshot';
import { createTask, setDone as setTaskDone, toggleChecklistItem, updateTask, type TaskResult } from '@/domain/tasks';
import { exportFileName, importFromText, mergeIncoming, serializeExport, type ImportResult } from '@/domain/transfer';
import type { Snapshot, Task, TaskInput } from '@/domain/types';
import { onLocalChange, onSyncStart } from '@/sync';
import { createBrowserJsonStorage } from '@/storage/local';
import { useSyncStore } from '@/stores/sync';
import { loadTasks, saveTasks, type LoadStatus } from '@/storage/tasks';

const sameTasks = (a: readonly Task[], b: readonly Task[]) => JSON.stringify(a) === JSON.stringify(b);

export const useTasksStore = defineStore('tasks', () => {
    const storage = createBrowserJsonStorage();
    const loaded = loadTasks(storage);

    const clock = createTodayClock();
    const today = clock.today;

    const tasks = ref<Task[]>(loaded.tasks);
    /** Последняя запись не удалась (квота, запрет доступа): интерфейс может сообщить об этом. */
    const saveFailed = ref(false);

    /** Что случилось при загрузке; интерфейс показывает это один раз при старте. */
    const startup: { status: LoadStatus; invalid: number; persistent: boolean } = {
        status: loaded.status,
        invalid: loaded.invalid,
        persistent: storage.persistent,
    };

    function persist(): void {
        if (!loaded.writable) return; // данные новой версии не перезаписываем
        saveFailed.value = !saveTasks(storage, tasks.value);
        onLocalChange();
    }

    /** Приводит список к состоянию «на сегодня» (повторы, архив, чистка) и сохраняет, если что-то изменилось. */
    function normalize(): void {
        const next = normalizeTasks(tasks.value, today.value, Date.now());
        if (sameTasks(tasks.value, next)) return;
        tasks.value = next;
        persist();
    }

    /** Применить изменение к списку, затем пересчитать и сохранить. */
    function commit(next: Task[]): void {
        tasks.value = normalizeTasks(next, today.value, Date.now());
        persist();
        useSyncStore().markLocalChange(Date.now()); // правка пользователя; автоматические пересчёты (normalize) сюда не попадают
    }

    function update(id: string, change: (task: Task) => Task): void {
        commit(tasks.value.map((task) => (task.id === id ? change(task) : task)));
    }

    // сменился день — догоняем повторы и переносим вчерашнее в архив
    watch(today, normalize, { flush: 'sync' });
    clock.start();
    onScopeDispose(clock.stop);
    normalize();
    onSyncStart();

    const lists = computed(() => splitTasks(tasks.value, today.value));

    return {
        tasks,
        today,
        active: computed(() => lists.value.active),
        archive: computed(() => lists.value.archive),
        empty: computed(() => tasks.value.length === 0),
        saveFailed,
        startup,

        toggleChecklistItem: (id: string, index: number) => update(id, (task) => toggleChecklistItem(task, index, Date.now())),
        setDone: (id: string, done: boolean) => update(id, (task) => setTaskDone(task, done, Date.now())),
        /** Создать задачу из данных формы. При ошибке проверки список не меняется. */
        addTask(input: TaskInput): TaskResult {
            const result = createTask(input, today.value, Date.now());
            if (result.ok) commit([...tasks.value, result.task]);
            return result;
        },
        /** Изменить задачу. `notFound` — её успели удалить (например, чистка старых). */
        updateTaskById(id: string, input: TaskInput): TaskResult | { ok: false; error: 'notFound' } {
            const current = tasks.value.find((task) => task.id === id);
            if (!current) return { ok: false, error: 'notFound' };

            const result = updateTask(current, input, today.value, Date.now());
            if (result.ok) commit(tasks.value.map((task) => (task.id === id ? result.task : task)));
            return result;
        },
        remove: (id: string) => commit(tasks.value.filter((task) => task.id !== id)),
        /** Заменить весь список (тестовые данные). */
        replaceAll: (next: Task[]) => commit(next),
        removeAll: () => commit([]),

        // --- обмен данными: файл экспорта и (позже) синхронизация ---

        /** Снимок для экспорта и синхронизации. */
        exportSnapshot: (): Snapshot => exportSnapshot(tasks.value, Date.now()),
        /** Содержимое файла экспорта и его имя. */
        exportFile: () => ({ name: exportFileName(today.value), text: serializeExport(tasks.value, Date.now()) }),
        /** Импорт из текста файла: свой формат или экспорт старого приложения. Список меняется только при успехе. */
        importText(text: string): ImportResult {
            const result = importFromText(text, tasks.value, today.value);
            if (result.ok) commit(result.tasks);
            return result;
        },
        /** Вход для синхронизации: слить внешний снимок по `updatedAt`. */
        importSnapshot(snapshot: Snapshot, strategy: MergeStrategy = 'merge-by-updated-at'): ImportReport | null {
            const parsed = parseImport(snapshot);
            if (!parsed) return null;

            const { tasks: merged, report } = mergeIncoming(tasks.value, parsed, today.value, strategy);
            commit(merged);
            return report;
        },
    };
});

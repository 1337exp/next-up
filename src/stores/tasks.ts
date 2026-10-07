import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { createTodayClock } from '@/composables/today';
import { normalizeTasks } from '@/domain/normalize';
import { splitTasks } from '@/domain/lifecycle';
import { setDone as setTaskDone, toggleChecklistItem } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { createBrowserJsonStorage } from '@/storage/local';
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
    }

    function update(id: string, change: (task: Task) => Task): void {
        commit(tasks.value.map((task) => (task.id === id ? change(task) : task)));
    }

    // сменился день — догоняем повторы и переносим вчерашнее в архив
    watch(today, normalize, { flush: 'sync' });
    clock.start();
    onScopeDispose(clock.stop);
    normalize();

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
        remove: (id: string) => commit(tasks.value.filter((task) => task.id !== id)),
        /** Заменить весь список (импорт, тестовые данные). */
        replaceAll: (next: Task[]) => commit(next),
    };
});

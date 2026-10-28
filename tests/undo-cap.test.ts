import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesStore } from '@/app/notes';
import { addDays, todayIso } from '@/core/date';

const today = todayIso();

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setActivePinia(createPinia());
});
afterEach(() => vi.useRealTimers());

describe('отмена при долгом наборе', () => {
    it('набор без пауз не превращается в один шаг: одна отмена не стирает минуту текста', () => {
        const store = useNotesStore();
        const input = (body: string) => ({ due: addDays(today, 2), body, items: [], repeat: null });
        store.add(input('начало'));
        vi.advanceTimersByTime(5000); // создание — отдельный шаг
        const id = store.active[0]!.id;

        // автосохранение редактора: правка каждые 700 мс, ни одной паузы дольше окна склейки, 30 секунд подряд
        for (let i = 1; i <= 43; i++) {
            store.edit(id, input(`текст ${i}`));
            vi.advanceTimersByTime(700);
        }
        expect(store.active[0]!.body).toBe('текст 43');

        store.undo();
        expect(store.active[0]!.body).not.toBe('начало'); // откатился кусок, а не всё сразу

        let steps = 1;
        while (store.canUndo && store.active[0]?.body !== 'начало') {
            store.undo();
            steps++;
        }
        expect(steps).toBeGreaterThanOrEqual(3); // 30 с / не более 10 с на шаг
    });
});

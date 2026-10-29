import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesStore } from '@/app/notes';
import { NOTES_KEY, V1_KEY } from '@/app/persistence';
import { exportSnapshot } from '@/core/codec';
import { addDays, todayIso } from '@/core/date';
import { note } from './helpers';

const today = todayIso();
const input = (body: string, due = today) => ({ due, body, items: [], repeat: null });
const saved = () => JSON.parse(localStorage.getItem(NOTES_KEY)!).notes as { id: string; body: string; deletedAt: number | null }[];

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setActivePinia(createPinia());
});
afterEach(() => vi.useRealTimers());

describe('стор заметок', () => {
    it('создаёт, показывает по спискам и сохраняет после паузы', () => {
        const store = useNotesStore();
        expect(store.add(input('сегодня')).ok).toBe(true);
        expect(store.add(input('вчера', addDays(today, -1))).ok).toBe(true);
        expect(store.active.map((n) => n.body)).toEqual(['сегодня']);
        expect(store.archive.map((n) => n.body)).toEqual(['вчера']);

        expect(localStorage.getItem(NOTES_KEY)).toBeNull(); // ещё не сохранено: идёт пауза
        vi.advanceTimersByTime(400);
        expect(saved().map((n) => n.body).sort()).toEqual(['вчера', 'сегодня']);
    });

    it('ошибка проверки не меняет список', () => {
        const store = useNotesStore();
        expect(store.add(input('   '))).toEqual({ ok: false, error: 'empty' });
        expect(store.notes).toHaveLength(0);
    });

    it('удаление — надгробие, отмена и повтор работают по заметкам', () => {
        const store = useNotesStore();
        store.add(input('a'));
        store.add(input('b'));
        const a = store.active.find((n) => n.body === 'a')!;

        store.remove(a.id);
        expect(store.active.map((n) => n.body)).toEqual(['b']);
        expect(store.notes.find((n) => n.id === a.id)!.deletedAt).not.toBeNull();

        expect(store.undo()).toBe(true);
        expect(store.active.map((n) => n.body).sort()).toEqual(['a', 'b']);
        expect(store.canRedo).toBe(true);
        expect(store.redo()).toBe(true);
        expect(store.active.map((n) => n.body)).toEqual(['b']);
    });

    it('сбрасывает «повтор» после нового действия; отменять нечего — false', () => {
        const store = useNotesStore();
        expect(store.undo()).toBe(false);
        store.add(input('a'));
        store.undo();
        store.add(input('b'));
        expect(store.canRedo).toBe(false);
    });

    it('завершение и отметка пункта', () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, 3), body: 'x', items: [{ id: 'i1', text: 'пункт', doneAt: null }], repeat: null });
        const id = store.active[0]!.id;

        store.toggleItem(id, 'i1');
        expect(store.notes[0]!.items[0]!.doneAt).not.toBeNull();
        store.setDone(id, true);
        expect(store.archive).toHaveLength(1);
        store.setDone(id, false);
        expect(store.active).toHaveLength(1);
    });

    it('повторяющаяся заметка в прошлом сама создаёт недостающие повторы', () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, -3), body: 'витамины', items: [], repeat: { every: 1, unit: 'day' } });
        expect(store.notes.map((n) => n.due)).toEqual([-3, -2, -1, 0].map((d) => addDays(today, d)));
        expect(store.active).toHaveLength(1);
        expect(store.archive).toHaveLength(3);
    });

    it('загружает сохранённое и сохраняет при уходе со страницы без паузы', () => {
        localStorage.setItem(NOTES_KEY, JSON.stringify(exportSnapshot([note({ id: 'n', due: today, body: 'было' })], 1)));
        const store = useNotesStore();
        expect(store.startup.status).toBe('ok');
        expect(store.active.map((n) => n.body)).toEqual(['было']);

        store.add(input('стало'));
        window.dispatchEvent(new Event('pagehide'));
        expect(saved()).toHaveLength(2);
    });
});

describe('загрузка и миграция', () => {
    it('ключ прежней версии копируется, а не переносится', () => {
        const v1 = { schemaVersion: 1, tasks: [{ id: 't', date: today, note: 'старая', checklist: [], recurrence: 'none', anchor: today, done: false, rolled: false, updatedAt: 5 }] };
        localStorage.setItem(V1_KEY, JSON.stringify(v1));

        const store = useNotesStore();
        expect(store.startup.status).toBe('migrated');
        expect(store.active.map((n) => n.body)).toEqual(['старая']);

        vi.advanceTimersByTime(400);
        expect(saved().map((n) => n.body)).toEqual(['старая']);
        expect(localStorage.getItem(V1_KEY)).toBe(JSON.stringify(v1)); // резерв нетронут
    });

    it('повреждённые данные откладываются в резерв, список начинается заново', () => {
        localStorage.setItem(NOTES_KEY, '{не json');
        const store = useNotesStore();
        expect(store.startup.status).toBe('corrupt');
        expect(localStorage.getItem(`${NOTES_KEY}.broken`)).toBe('{не json');
        expect(store.notes).toHaveLength(0);
    });

    it('данные более новой версии не перезаписываются', () => {
        const future = JSON.stringify({ app: 'nextup', version: 99, notes: [] });
        localStorage.setItem(NOTES_KEY, future);
        const store = useNotesStore();
        expect(store.startup.status).toBe('newer');

        store.add(input('a'));
        vi.advanceTimersByTime(400);
        expect(localStorage.getItem(NOTES_KEY)).toBe(future);
    });
});

describe('несколько вкладок', () => {
    it('запись из другой вкладки сливается, а не затирает', () => {
        const store = useNotesStore();
        store.add(input('здесь'));
        vi.advanceTimersByTime(400);

        // другая вкладка записала свою заметку, не зная о нашей
        const other = note({ id: 'other', due: today, body: 'там', updatedAt: Date.now() });
        localStorage.setItem(NOTES_KEY, JSON.stringify(exportSnapshot([other], Date.now())));
        window.dispatchEvent(new StorageEvent('storage', { key: NOTES_KEY }));

        expect(store.active.map((n) => n.body).sort()).toEqual(['здесь', 'там']);
    });
});

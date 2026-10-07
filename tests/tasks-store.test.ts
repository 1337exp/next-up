import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { KEYS } from '@/storage/local';
import { useTasksStore } from '@/stores/tasks';
import type { Task } from '@/domain/types';
import { makeTask } from './helpers';

const stored = () => JSON.parse(localStorage.getItem(KEYS.tasks) ?? 'null') as { schemaVersion: number; tasks: Task[] } | null;
const seed = (tasks: Task[], schemaVersion = 1) => localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion, tasks }));
const freshStore = () => {
    setActivePinia(createPinia());
    return useTasksStore();
};

describe('стор задач', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(new Date(2026, 9, 6, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    it('первый запуск: пусто и ничего не пишет в хранилище', () => {
        const s = freshStore();
        expect(s.empty).toBe(true);
        expect(s.startup.status).toBe('empty');
        expect(localStorage.getItem(KEYS.tasks)).toBeNull();
    });

    it('при старте догоняет повторы и сохраняет результат', () => {
        seed([makeTask({ id: 'w', date: '2026-09-01', recurrence: 'weekly', note: 'weekly' })]);
        const s = freshStore();

        expect(s.tasks.map((t) => t.date)).toEqual([
            '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29', '2026-10-06',
        ]);
        // 6 октября — сегодня: это уже не пропущенный повтор, а активная задача; следующая появится завтра
        expect(s.active.map((t) => t.date)).toEqual(['2026-10-06']);
        expect(s.archive).toHaveLength(5);
        expect(stored()!.tasks).toHaveLength(6);
    });

    it('без изменений ничего не перезаписывает', () => {
        seed([makeTask({ id: 'a', date: '2026-10-20' })]);
        const before = localStorage.getItem(KEYS.tasks);
        freshStore();
        expect(localStorage.getItem(KEYS.tasks)).toBe(before);
    });

    it('в полночь вчерашнее уходит в архив, повторы продлеваются, всё сохраняется', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 23, 59, 30));
        seed([makeTask({ id: 'today', date: '2026-10-06', note: 'x' }), makeTask({ id: 'rep', date: '2026-10-06', recurrence: 'daily', note: 'rep' })]);
        const s = freshStore();
        expect(s.active.map((t) => t.id)).toContain('today');

        vi.advanceTimersByTime(31_000);
        await nextTick();

        expect(s.today).toBe('2026-10-07');
        expect(s.active.map((t) => t.date)).toEqual(['2026-10-07']); // осталась только новая копия ежедневной
        expect(s.archive.map((t) => t.id)).toContain('today');
        expect(stored()!.tasks).toHaveLength(3);
    });

    it('отметка пункта чек-листа сохраняет время', () => {
        seed([makeTask({ id: 'c', date: '2026-10-20', checklist: [{ text: 'a', done: false, changedAt: null }] })]);
        const s = freshStore();

        s.toggleChecklistItem('c', 0);
        expect(s.tasks[0]!.checklist[0]).toEqual({ text: 'a', done: true, changedAt: new Date(2026, 9, 6, 12).toISOString() });
        expect(stored()!.tasks[0]!.checklist[0]!.done).toBe(true);

        s.toggleChecklistItem('c', 0);
        expect(stored()!.tasks[0]!.checklist[0]).toEqual({ text: 'a', done: false, changedAt: null });
    });

    it('«завершено» переносит в архив и запускает следующий повтор; «в работу» возвращает без дублей', () => {
        seed([makeTask({ id: 'm', date: '2026-10-20', recurrence: 'monthly', note: 'm' })]);
        const s = freshStore();

        s.setDone('m', true);
        expect(s.archive.map((t) => t.id)).toEqual(['m']);
        expect(s.active.map((t) => t.date)).toEqual(['2026-11-20']);

        s.setDone('m', false);
        expect(s.active.map((t) => t.date)).toEqual(['2026-10-20', '2026-11-20']);
        expect(s.tasks).toHaveLength(2);
    });

    it('удаление', () => {
        seed([makeTask({ id: 'a', date: '2026-10-20' }), makeTask({ id: 'b', date: '2026-10-21' })]);
        const s = freshStore();
        s.remove('a');
        expect(s.tasks.map((t) => t.id)).toEqual(['b']);
        expect(stored()!.tasks.map((t) => t.id)).toEqual(['b']);
    });

    it('данные более новой версии читаются, но не перезаписываются', () => {
        seed([makeTask({ id: 'future', date: '2026-10-20' })], 2);
        const raw = localStorage.getItem(KEYS.tasks);
        const s = freshStore();

        expect(s.startup.status).toBe('newer-version');
        expect(s.tasks).toHaveLength(1);
        s.remove('future');
        expect(s.tasks).toHaveLength(0); // в памяти изменение есть
        expect(localStorage.getItem(KEYS.tasks)).toBe(raw); // а на диске данные нетронуты
    });

    it('повреждённые данные: стартует пустым, копия сохранена, о проблеме сообщается', () => {
        localStorage.setItem(KEYS.tasks, '{"schemaVersion":1,');
        const s = freshStore();
        expect(s.empty).toBe(true);
        expect(s.startup.status).toBe('corrupt');
        expect(localStorage.getItem(KEYS.tasksCorruptBackup)).toBe('{"schemaVersion":1,');
    });

    it('сбой записи (квота) не роняет приложение и поднимает флаг', () => {
        seed([makeTask({ id: 'a', date: '2026-10-20' })]);
        const real = window.localStorage;
        const fake = {
            getItem: (k: string) => real.getItem(k),
            removeItem: (k: string) => real.removeItem(k),
            setItem: (k: string, v: string) => {
                if (k === KEYS.tasks) throw new DOMException('quota', 'QuotaExceededError');
                real.setItem(k, v);
            },
        };
        Object.defineProperty(window, 'localStorage', { value: fake, configurable: true });
        try {
            const s = freshStore();
            expect(s.saveFailed).toBe(false);
            expect(() => s.remove('a')).not.toThrow();
            expect(s.tasks).toHaveLength(0);
            expect(s.saveFailed).toBe(true);
        } finally {
            Object.defineProperty(window, 'localStorage', { value: real, configurable: true });
        }
    });
});

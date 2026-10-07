import { describe, expect, it } from 'vitest';
import { loadTasks, saveTasks } from '@/storage/tasks';
import { KEYS } from '@/storage/local';
import { makeTask, memoryJsonStorage } from './helpers';

describe('хранилище задач', () => {
    it('первый запуск: пусто', () => {
        const { storage } = memoryJsonStorage();
        expect(loadTasks(storage)).toEqual({ tasks: [], status: 'empty', invalid: 0, writable: true });
    });

    it('запись и чтение возвращают те же задачи под ключом nextup-tasks', () => {
        const { storage, map } = memoryJsonStorage();
        const tasks = [makeTask({ id: 'a', recurrence: 'monthly' }), makeTask({ id: 'b', done: true })];

        expect(saveTasks(storage, tasks)).toBe(true);
        expect([...map.keys()]).toEqual(['nextup-tasks']);
        expect(loadTasks(storage)).toMatchObject({ tasks, status: 'ok', invalid: 0, writable: true });
    });

    it('повреждённые записи пропускаются и считаются, остальные читаются', () => {
        const stored = { schemaVersion: 1, tasks: [makeTask({ id: 'ok' }), { id: 'bad' }, 7] };
        const { storage } = memoryJsonStorage({ [KEYS.tasks]: JSON.stringify(stored) });
        const loaded = loadTasks(storage);
        expect(loaded.tasks.map((t) => t.id)).toEqual(['ok']);
        expect(loaded.invalid).toBe(2);
    });

    it('нечитаемые данные: копия сохраняется, приложение стартует с пустым списком', () => {
        const broken = '{"schemaVersion":1,"tasks":[';
        const { storage, map } = memoryJsonStorage({ [KEYS.tasks]: broken });

        expect(loadTasks(storage)).toMatchObject({ tasks: [], status: 'corrupt' });
        expect(map.get(KEYS.tasksCorruptBackup)).toBe(broken);
    });

    it('данные неожиданной формы тоже считаются повреждёнными, а не теряются молча', () => {
        const odd = JSON.stringify({ hello: 'world' });
        const { storage, map } = memoryJsonStorage({ [KEYS.tasks]: odd });
        expect(loadTasks(storage).status).toBe('corrupt');
        expect(map.get(KEYS.tasksCorruptBackup)).toBe(odd);
    });

    it('данные более новой версии читаются, но поверх них писать нельзя', () => {
        const stored = { schemaVersion: 2, tasks: [makeTask({ id: 'future' })] };
        const { storage } = memoryJsonStorage({ [KEYS.tasks]: JSON.stringify(stored) });
        expect(loadTasks(storage)).toMatchObject({ status: 'newer-version', writable: false });
    });

    it('сбой записи (квота) не бросает исключение', () => {
        const { storage } = memoryJsonStorage();
        const failing = { ...storage, write: () => false };
        expect(saveTasks(failing, [makeTask()])).toBe(false);
    });
});

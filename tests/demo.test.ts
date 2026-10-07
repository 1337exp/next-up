import { describe, expect, it } from 'vitest';
import { buildDemoTasks } from '@/dev/demo';
import { normalizeTasks } from '@/domain/normalize';
import { splitTasks } from '@/domain/lifecycle';
import { parseTaskRecord } from '@/domain/snapshot';
import { idGenerator } from './helpers';

describe('тестовые данные для разработки', () => {
    const today = '2026-10-06';
    const tasks = buildDemoTasks(today, 1, idGenerator('d'));

    it('все записи проходят проверку формата', () => {
        for (const task of tasks) expect(parseTaskRecord(JSON.parse(JSON.stringify(task))), task.note).not.toBeNull();
    });

    it('покрывают активные и архивные состояния', () => {
        const { active, archive } = splitTasks(normalizeTasks(tasks, today, 1, idGenerator('n')), today);
        expect(active.length).toBeGreaterThanOrEqual(6);
        expect(archive.length).toBeGreaterThanOrEqual(3);
    });
});

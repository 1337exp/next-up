import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getSyncAdapter, isAllowedEndpoint } from '@/sync';
import { useSettingsStore } from '@/stores/settings';
import { useTasksStore } from '@/stores/tasks';
import { KEYS } from '@/storage/local';
import { makeTask } from './helpers';

const hooks = vi.hoisted(() => ({ onSyncStart: vi.fn(), onLocalChange: vi.fn() }));

vi.mock('@/sync', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/sync')>()), ...hooks }));

describe('адрес синхронизации', () => {
    it('разрешены https, локальный http и пустая строка (выключено)', () => {
        for (const ok of ['', 'https://example.com/sync', 'https://example.com:8443/a?b=1', 'http://localhost:3000/sync', 'http://127.0.0.1/x', 'http://[::1]:8080/']) {
            expect(isAllowedEndpoint(ok), ok).toBe(true);
        }
    });

    it('всё остальное отвергается', () => {
        for (const bad of ['http://example.com/sync', 'ftp://example.com', 'javascript:alert(1)', 'data:text/plain,hi', 'example.com/sync', '//example.com', 'https://user:pass@example.com', 'https://', '   ']) {
            expect(isAllowedEndpoint(bad), bad).toBe(false);
        }
    });

    it('в настройках сохраняется только допустимый адрес, пробелы обрезаются', () => {
        localStorage.clear();
        setActivePinia(createPinia());
        const s = useSettingsStore();

        expect(s.setSyncEndpoint('  https://example.com/sync  ')).toBe(true);
        expect(s.syncEndpoint).toBe('https://example.com/sync');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').sync.endpoint).toBe('https://example.com/sync');

        expect(s.setSyncEndpoint('http://evil.example')).toBe(false);
        expect(s.syncEndpoint).toBe('https://example.com/sync'); // прежний адрес остался

        expect(s.setSyncEndpoint('')).toBe(true); // выключить
        expect(s.syncEndpoint).toBe('');
    });

    it('адаптер есть только у допустимого непустого адреса', () => {
        expect(getSyncAdapter({ sync: { endpoint: 'https://example.com/wh_tasks_TOKEN' } })).not.toBeNull();
        expect(getSyncAdapter({ sync: { endpoint: 'http://localhost:8787/wh_tasks_TOKEN' } })).not.toBeNull();
        expect(getSyncAdapter({ sync: { endpoint: '' } })).toBeNull();
        expect(getSyncAdapter({ sync: { endpoint: 'http://example.com/sync' } })).toBeNull();
    });
});

describe('точки входа и выхода синхронизации в сторе', () => {
    beforeEach(() => {
        localStorage.clear();
        hooks.onSyncStart.mockClear();
        hooks.onLocalChange.mockClear();
        setActivePinia(createPinia());
    });

    it('«запуск» вызывается один раз при создании стора', () => {
        useTasksStore();
        expect(hooks.onSyncStart).toHaveBeenCalledTimes(1);
    });

    it('«локальные данные сохранены» вызывается после каждого сохранённого изменения', () => {
        const s = useTasksStore();
        expect(hooks.onLocalChange).not.toHaveBeenCalled(); // пустое хранилище, ничего не менялось

        s.addTask({ date: '2999-01-01', note: 'a', checklist: [], recurrence: 'none' });
        expect(hooks.onLocalChange).toHaveBeenCalledTimes(1);

        s.remove(s.tasks[0]!.id);
        expect(hooks.onLocalChange).toHaveBeenCalledTimes(2);
    });

    it('не вызывается, если ничего не сохранено: данные новой версии не перезаписываются', () => {
        localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 2, tasks: [makeTask({ id: 'f', date: '2999-01-01' })] }));
        const s = useTasksStore();
        s.remove('f');
        expect(hooks.onLocalChange).not.toHaveBeenCalled();
    });

    it('exportSnapshot / importSnapshot: готовый вход для будущей синхронизации', () => {
        const s = useTasksStore();
        s.addTask({ date: '2999-01-01', note: 'локальная', checklist: [], recurrence: 'none' });
        const snapshot = s.exportSnapshot();
        expect(snapshot).toMatchObject({ format: 'nextup', schemaVersion: 1 });
        expect(snapshot.tasks).toHaveLength(1);

        // внешний снимок: новая задача и более свежая правка существующей
        const existing = snapshot.tasks[0]!;
        const external = { ...snapshot, tasks: [{ ...existing, note: 'правка снаружи', updatedAt: existing.updatedAt + 1000 }, makeTask({ id: 'ext', date: '2999-02-02', note: 'внешняя', updatedAt: 1 })] };

        const report = s.importSnapshot(external);
        expect(report).toMatchObject({ added: 1, updated: 1, skipped: 0 });
        expect(s.tasks.map((t) => t.note).sort()).toEqual(['внешняя', 'правка снаружи']);
        expect(s.importSnapshot({ ...external, format: 'other' } as never)).toBeNull();
    });
});

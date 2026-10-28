import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesStore } from '@/app/notes';
import { SETTINGS_KEY } from '@/app/settings';
import { DEBOUNCE_MS, FOCUS_GAP_MS, useSyncStore } from '@/app/sync';
import { exportSnapshot } from '@/core/codec';
import { addDays, todayIso } from '@/core/date';
import { note } from './helpers';

const today = todayIso();
const URL = 'https://sync.example.com/doc';

/** Сервер в fetch: один документ с ETag и условиями записи. */
function fakeServer() {
    const state = { body: null as string | null, version: 0, gets: 0, puts: 0, down: false };
    const etag = () => (state.body === null ? null : `"v${state.version}"`);
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
        if (state.down) throw new TypeError('network');
        const headers = new Headers(init.headers);
        if (init.method === 'GET') {
            state.gets++;
            return state.body === null ? new Response('', { status: 404 }) : new Response(state.body, { status: 200, headers: { ETag: etag()! } });
        }
        state.puts++;
        const ifMatch = headers.get('If-Match');
        if ((ifMatch && ifMatch !== etag()) || (headers.get('If-None-Match') === '*' && state.body !== null)) return new Response('', { status: 412 });
        state.body = init.body as string;
        state.version++;
        return new Response('', { status: 200, headers: { ETag: etag()! } });
    });
    return { state, fetchImpl };
}

function configure(sync: Record<string, unknown>) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ sync }));
}

const input = (body: string) => ({ due: addDays(today, 2), body, items: [], repeat: null });
const flush = () => vi.advanceTimersByTimeAsync(0);

let pinia: Pinia;

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    pinia = createPinia();
    setActivePinia(pinia);
});
afterEach(() => {
    // освобождаем сторы: их слушатели window / document иначе доживут до следующего теста (в приложении стор один)
    (pinia as unknown as { _s: Map<string, { $dispose(): void }> })._s.forEach((store) => store.$dispose());
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('стор синхронизации', () => {
    it('выключена: ничего не делает и не ходит в сеть', async () => {
        const { fetchImpl } = fakeServer();
        vi.stubGlobal('fetch', fetchImpl);
        const sync = useSyncStore();
        useNotesStore().add(input('a'));
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);

        expect(sync.status).toBe('off');
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('адрес не годится (http не для localhost): остаётся выключенной, даже если включена', () => {
        configure({ enabled: true, url: 'http://example.com/doc' });
        expect(useSyncStore().status).toBe('off');
    });

    it('при старте забирает документ, а правка уходит через паузу, не раньше', async () => {
        const server = fakeServer();
        server.state.body = JSON.stringify(exportSnapshot([note({ id: 'remote', due: today, body: 'с другого устройства', updatedAt: 5 })], 1));
        server.state.version = 1;
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });

        const sync = useSyncStore();
        const notes = useNotesStore();
        await flush();

        expect(server.state.gets).toBe(1);
        expect(notes.active.map((n) => n.body)).toEqual(['с другого устройства']);
        expect(sync.status).toBe('idle');
        expect(sync.lastSyncedAt).not.toBeNull();

        notes.add(input('моя правка'));
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 100);
        expect(server.state.puts).toBe(0); // ещё идёт пауза
        await vi.advanceTimersByTimeAsync(200);
        expect(server.state.puts).toBe(1);
        expect(JSON.parse(server.state.body!).notes.map((n: { body: string }) => n.body).sort()).toEqual(['моя правка', 'с другого устройства']);
    });

    it('чужое, принятое с сервера, не запускает новую отправку (петли нет)', async () => {
        const server = fakeServer();
        server.state.body = JSON.stringify(exportSnapshot([note({ id: 'r', due: today, updatedAt: 5 })], 1));
        server.state.version = 1;
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });

        useSyncStore();
        const notes = useNotesStore();
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS * 3);

        expect(notes.revision).toBe(0); // applyRemote не считается правкой пользователя
        expect(server.state.gets).toBe(1);
        expect(server.state.puts).toBe(0);
    });

    it('быстрые правки подряд — одна отправка', async () => {
        const server = fakeServer();
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });
        useSyncStore();
        const notes = useNotesStore();
        await flush();

        for (let i = 0; i < 5; i++) {
            notes.add(input(`заметка ${i}`));
            await vi.advanceTimersByTimeAsync(500);
        }
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);

        expect(server.state.puts).toBe(1);
    });

    it('сбой сети: статус error с причиной, потом сеть вернулась — сама повторяет', async () => {
        const server = fakeServer();
        server.state.down = true;
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });

        const sync = useSyncStore();
        await flush();
        expect(sync.status).toBe('error');
        expect(sync.failure).toBe('network');

        server.state.down = false;
        window.dispatchEvent(new Event('online'));
        await flush();
        expect(sync.status).toBe('idle');
        expect(sync.failure).toBeNull();
    });

    it('нет сети: статус offline и никаких запросов, пока она не появится', async () => {
        const server = fakeServer();
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });
        const sync = useSyncStore();
        await flush();
        const calls = server.fetchImpl.mock.calls.length;

        window.dispatchEvent(new Event('offline'));
        useNotesStore().add(input('без сети'));
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);

        expect(sync.status).toBe('offline');
        expect(server.fetchImpl.mock.calls.length).toBe(calls);

        window.dispatchEvent(new Event('online'));
        await flush();
        expect(server.state.puts).toBe(1); // накопленное ушло, как только сеть вернулась
    });

    it('возврат на вкладку: забирает чужое, но не чаще чем раз в FOCUS_GAP_MS', async () => {
        const server = fakeServer();
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });
        useSyncStore();
        await flush();
        expect(server.state.gets).toBe(1);

        document.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(server.state.gets).toBe(1); // слишком рано

        await vi.advanceTimersByTimeAsync(FOCUS_GAP_MS + 100);
        document.dispatchEvent(new Event('visibilitychange'));
        await flush();
        expect(server.state.gets).toBe(2);
    });

    it('правка во время сеанса не теряется: уходит следующим', async () => {
        const server = fakeServer();
        vi.stubGlobal('fetch', server.fetchImpl);
        configure({ enabled: true, url: URL });
        const sync = useSyncStore();
        const notes = useNotesStore();
        await flush();

        notes.add(input('первая'));
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 10);
        const running = sync.syncNow(); // ещё один сеанс запущен руками
        notes.add(input('вторая'));
        await running;
        await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 100);

        const bodies = JSON.parse(server.state.body!).notes.map((n: { body: string }) => n.body);
        expect(bodies).toEqual(expect.arrayContaining(['первая', 'вторая']));
    });
});

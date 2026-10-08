import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI from '@1337exp/taoui';
import SyncSection from '@/components/SyncSection.vue';
import { useCloudSync, type SyncConfirms } from '@/composables/cloudSync';
import { exportSnapshot } from '@/domain/snapshot';
import { applyLocale } from '@/i18n';
import { KEYS } from '@/storage/local';
import { useSettingsStore } from '@/stores/settings';
import { useSyncStore } from '@/stores/sync';
import { useTasksStore } from '@/stores/tasks';
import type { PullResult, PushOptions, PushResult, SyncAdapter } from '@/sync/types';
import type { Snapshot, Task } from '@/domain/types';
import { makeTask } from './helpers';

// confirm() и toast() подменяем: настоящие монтируют свои хосты в body
const mocks = vi.hoisted(() => ({ answer: true, asked: [] as string[], toasts: [] as string[] }));

vi.mock('@1337exp/taoui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@1337exp/taoui')>();
    const confirm = (title: string) => {
        mocks.asked.push(title);
        const builder: Record<string, unknown> = { then: (resolve: (value: boolean) => void) => resolve(mocks.answer) };
        for (const name of ['message', 'ok', 'cancel', 'danger']) {
            builder[name] = (value?: unknown) => {
                if (name === 'message') mocks.asked.push(String(value));
                return builder;
            };
        }
        return builder;
    };
    const toast = Object.assign(vi.fn(), {
        warning: (m: string) => void mocks.toasts.push(`warning: ${m}`),
        error: (m: string) => void mocks.toasts.push(`error: ${m}`),
        success: (m: string) => void mocks.toasts.push(`success: ${m}`),
    });
    return { ...original, confirm, toast };
});

// сеть подменяем программируемым адаптером
const remote = vi.hoisted(() => ({
    pull: null as null | (() => PullResult | Promise<PullResult>),
    push: null as null | ((snapshot: Snapshot, options: PushOptions) => PushResult | Promise<PushResult>),
    pushes: [] as { snapshot: Snapshot; options: PushOptions }[],
}));

vi.mock('@/sync', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/sync')>();
    const adapter: SyncAdapter = {
        pull: async () => (remote.pull ? remote.pull() : { ok: true, snapshot: null }),
        push: async (snapshot, options) => {
            remote.pushes.push({ snapshot, options });
            return remote.push ? remote.push(snapshot, options) : { ok: true };
        },
    };
    return { ...original, getSyncAdapter: ({ sync }: { sync: { endpoint: string } }) => (sync.endpoint ? adapter : null) };
});

const ENDPOINT = 'https://example.com/wh_tasks_TESTTOKEN';

function setup(tasks: Task[] = [], state: { changedAt?: number; syncedAt?: number } = {}, endpoint = ENDPOINT) {
    localStorage.clear();
    localStorage.setItem(KEYS.settings, JSON.stringify({ schemaVersion: 1, locale: 'ru', sync: { endpoint } }));
    if (tasks.length) localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks }));
    if (state.changedAt !== undefined || state.syncedAt !== undefined) localStorage.setItem(KEYS.syncState, JSON.stringify(state));
    const pinia = createPinia();
    setActivePinia(pinia);
    return { pinia, tasks: useTasksStore(), sync: useSyncStore(), settings: useSettingsStore() };
}

const serverSnapshot = (exportedAt: number, notes: string[]): Snapshot => exportSnapshot(notes.map((note, i) => makeTask({ id: `s${i}`, date: '2999-01-0' + (i + 1), note })), exportedAt);

const confirms = (answer: boolean): SyncConfirms & { asked: string[] } => {
    const asked: string[] = [];
    return {
        asked,
        localNewer: async () => (asked.push('localNewer'), answer),
        serverNewer: async () => (asked.push('serverNewer'), answer),
    };
};

beforeEach(() => {
    applyLocale('ru');
    remote.pull = null;
    remote.push = null;
    remote.pushes.length = 0;
    mocks.answer = true;
    mocks.asked.length = 0;
    mocks.toasts.length = 0;
});

describe('метки времени синхронизации', () => {
    it('правка пользователя отмечает изменение, автоматический пересчёт (повторы, смена дня) — нет', () => {
        const old = makeTask({ id: 'daily', date: '2020-01-01', note: 'повтор', recurrence: 'daily', anchor: '2020-01-01' });
        const { tasks, sync } = setup([old]);
        expect(tasks.tasks.length).toBeGreaterThan(0); // при запуске список пересчитан и сохранён
        expect(sync.changedAt).toBe(0);

        tasks.addTask({ date: '2999-01-01', note: 'новая', checklist: [], recurrence: 'none' });
        expect(sync.changedAt).toBeGreaterThan(0);
        expect(JSON.parse(localStorage.getItem(KEYS.syncState) ?? '{}').changedAt).toBe(sync.changedAt);
    });

    it('повреждённое состояние читается как «ничего не менялось»', () => {
        localStorage.setItem(KEYS.syncState, '{"changedAt":"вчера","syncedAt":-5}');
        setActivePinia(createPinia());
        const sync = useSyncStore();
        expect([sync.changedAt, sync.syncedAt, sync.hasUnsynced]).toEqual([0, 0, false]);
    });
});

describe('«Скачать»', () => {
    it('на сервере новее, чем наши правки: заменяет без вопросов и запоминает метку', async () => {
        const { tasks, sync } = setup([makeTask({ id: 'local', date: '2999-02-02', note: 'старая' })], { changedAt: 1000, syncedAt: 500 });
        remote.pull = () => ({ ok: true, snapshot: serverSnapshot(5000, ['с сервера']) });
        const ask = confirms(true);

        const result = await useCloudSync().download(ask);
        expect(result).toMatchObject({ status: 'ok', count: 1 });
        expect(ask.asked).toEqual([]);
        expect(tasks.tasks.map((t) => t.note)).toEqual(['с сервера']);
        expect([sync.syncedAt, sync.changedAt, sync.hasUnsynced]).toEqual([5000, 5000, false]);
    });

    it('наши правки позже, чем снимок на сервере: предупреждает; «нет» ничего не меняет', async () => {
        const { tasks, sync } = setup([makeTask({ id: 'local', date: '2999-02-02', note: 'моя правка' })], { changedAt: 9000, syncedAt: 500 });
        remote.pull = () => ({ ok: true, snapshot: serverSnapshot(5000, ['с сервера']) });
        const ask = confirms(false);

        expect(await useCloudSync().download(ask)).toEqual({ status: 'cancelled' });
        expect(ask.asked).toEqual(['localNewer']);
        expect(tasks.tasks.map((t) => t.note)).toEqual(['моя правка']);
        expect([sync.syncedAt, sync.changedAt]).toEqual([500, 9000]);
    });

    it('наши правки позже: после «да» данные заменяются', async () => {
        const { tasks } = setup([makeTask({ id: 'local', date: '2999-02-02', note: 'моя правка' })], { changedAt: 9000, syncedAt: 500 });
        remote.pull = () => ({ ok: true, snapshot: serverSnapshot(5000, ['с сервера']) });

        expect(await useCloudSync().download(confirms(true))).toMatchObject({ status: 'ok' });
        expect(tasks.tasks.map((t) => t.note)).toEqual(['с сервера']);
    });

    it('сервер пуст: ничего не трогаем', async () => {
        const { tasks } = setup([makeTask({ id: 'local', date: '2999-02-02', note: 'моя' })]);
        expect(await useCloudSync().download(confirms(true))).toEqual({ status: 'empty' });
        expect(tasks.tasks).toHaveLength(1);
    });

    it('ошибка сети, нет адреса и неправильные данные не ломают список', async () => {
        const { tasks } = setup([makeTask({ id: 'local', date: '2999-02-02', note: 'моя' })]);
        remote.pull = () => ({ ok: false, error: 'network' });
        expect(await useCloudSync().download(confirms(true))).toEqual({ status: 'error', error: 'network' });
        expect(tasks.tasks).toHaveLength(1);

        const bad = { format: 'nextup', exportedAt: 1, tasks: 'не массив' } as unknown as Snapshot;
        remote.pull = () => ({ ok: true, snapshot: bad });
        expect(await useCloudSync().download(confirms(true))).toEqual({ status: 'badData' });
        expect(tasks.tasks).toHaveLength(1);

        setup([], {}, '');
        expect(await useCloudSync().download(confirms(true))).toEqual({ status: 'noEndpoint' });
    });

    it('сразу после скачивания повторное скачивание не предупреждает: метки сходятся', async () => {
        setup([], { changedAt: 100, syncedAt: 100 });
        remote.pull = () => ({ ok: true, snapshot: serverSnapshot(5000, ['с сервера']) });
        const ask = confirms(true);
        const cloud = useCloudSync();
        await cloud.download(ask);
        await cloud.download(ask);
        expect(ask.asked).toEqual([]);
    });
});

describe('«Загрузить»', () => {
    it('отдаёт снимок с меткой последней синхронизации и запоминает новую', async () => {
        const { sync } = setup([makeTask({ id: 'a', date: '2999-02-02', note: 'моя' })], { changedAt: 2000, syncedAt: 1000 });

        const result = await useCloudSync().upload(confirms(true));
        expect(result).toEqual({ status: 'ok', count: 1 });
        expect(remote.pushes).toHaveLength(1);
        expect(remote.pushes[0]!.options).toEqual({ syncedAt: 1000 });
        expect(remote.pushes[0]!.snapshot.tasks.map((t) => t.note)).toEqual(['моя']);
        expect(sync.syncedAt).toBe(remote.pushes[0]!.snapshot.exportedAt);
        expect(sync.hasUnsynced).toBe(false);
    });

    it('на сервере новее нашей последней синхронизации: предупреждает; «нет» ничего не отправляет', async () => {
        const { sync } = setup([makeTask({ id: 'a', date: '2999-02-02', note: 'моя' })], { changedAt: 2000, syncedAt: 1000 });
        remote.push = () => ({ ok: false, error: 'conflict', serverExportedAt: 1500 });
        const ask = confirms(false);

        expect(await useCloudSync().upload(ask)).toEqual({ status: 'cancelled' });
        expect(ask.asked).toEqual(['serverNewer']);
        expect(remote.pushes).toHaveLength(1);
        expect(sync.syncedAt).toBe(1000);
    });

    it('после «да» повторяет с «force» и запоминает метку', async () => {
        const { sync } = setup([makeTask({ id: 'a', date: '2999-02-02', note: 'моя' })], { changedAt: 2000, syncedAt: 1000 });
        remote.push = (_snapshot, options) => (options.force ? { ok: true } : { ok: false, error: 'conflict', serverExportedAt: 1500 });

        expect(await useCloudSync().upload(confirms(true))).toEqual({ status: 'ok', count: 1 });
        expect(remote.pushes.map((p) => p.options.force ?? false)).toEqual([false, true]);
        expect(sync.syncedAt).toBe(remote.pushes[1]!.snapshot.exportedAt);
    });

    it('ошибки: сеть и нет доступа возвращаются кодом, метка не меняется', async () => {
        const { sync } = setup([], { changedAt: 2000, syncedAt: 1000 });
        remote.push = () => ({ ok: false, error: 'unauthorized' });
        expect(await useCloudSync().upload(confirms(true))).toEqual({ status: 'error', error: 'unauthorized' });
        expect(sync.syncedAt).toBe(1000);

        setup([], {}, '');
        expect(await useCloudSync().upload(confirms(true))).toEqual({ status: 'noEndpoint' });
    });

    it('пока идёт обмен, второй запуск игнорируется', async () => {
        setup([makeTask({ id: 'a', date: '2999-02-02', note: 'моя' })]);
        let release: () => void = () => {};
        remote.push = () => new Promise<PushResult>((resolve) => (release = () => resolve({ ok: true })));
        const cloud = useCloudSync();

        const first = cloud.upload(confirms(true));
        expect(cloud.busy.value).toBe(true);
        expect(await cloud.upload(confirms(true))).toEqual({ status: 'cancelled' });
        release();
        expect(await first).toMatchObject({ status: 'ok' });
        expect(cloud.busy.value).toBe(false);
        expect(remote.pushes).toHaveLength(1);
    });
});

describe('секция «Облако» в настройках', () => {
    function mountSection(tasks: Task[] = [], state: { changedAt?: number; syncedAt?: number } = {}, endpoint = ENDPOINT) {
        const { pinia } = setup(tasks, state, endpoint);
        return mount(SyncSection, { global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
    }
    const click = async (w: ReturnType<typeof mountSection>, selector: string) => {
        await w.find(selector).trigger('click');
        await vi.waitFor(() => expect(w.vm).toBeTruthy());
        for (let i = 0; i < 8; i++) await Promise.resolve();
        await nextTick();
    };

    it('«Загрузить»: успех — сообщение с числом задач и строка статуса', async () => {
        const w = mountSection([makeTask({ id: 'a', date: '2999-02-02', note: 'моя' })]);
        expect(w.text()).toContain('Ещё не синхронизировалось.');
        await click(w, '.upload');
        expect(mocks.toasts).toEqual(['success: Загружено на сервер. Задач: 1.']);
        expect(w.text()).toContain('Синхронизировано:');
        expect(w.text()).not.toContain('Есть изменения');
        w.unmount();
    });

    it('«Скачать»: если правки новее сервера, спрашивает с обеими датами; отказ — сообщений нет', async () => {
        mocks.answer = false;
        remote.pull = () => ({ ok: true, snapshot: serverSnapshot(5000, ['с сервера']) });
        const w = mountSection([makeTask({ id: 'local', date: '2999-02-02', note: 'моя' })], { changedAt: 9000, syncedAt: 500 });
        await click(w, '.download');
        expect(mocks.asked[0]).toBe('Данные на устройстве новее');
        expect(mocks.asked[1]).toContain('Скачивание заменит данные на устройстве');
        expect(mocks.toasts).toEqual([]);
        w.unmount();
    });

    it('«Скачать»: пустой сервер и ошибки показываются понятным текстом', async () => {
        const w = mountSection();
        await click(w, '.download');
        expect(mocks.toasts.pop()).toBe('warning: На сервере пока нет данных: сначала загрузите их.');

        remote.pull = () => ({ ok: false, error: 'unauthorized' });
        await click(w, '.download');
        expect(mocks.toasts.pop()).toBe('error: Нет доступа: проверьте токен в адресе.');

        remote.pull = () => ({ ok: false, error: 'network' });
        await click(w, '.download');
        expect(mocks.toasts.pop()).toBe('error: Сервер недоступен. Проверьте адрес и подключение.');
        w.unmount();
    });

    it('кнопки недоступны без адреса; после правок видно «есть изменения, которых нет на сервере»', async () => {
        const without = mountSection([], {}, '');
        expect(without.find<HTMLButtonElement>('.upload').element.disabled).toBe(true);
        expect(without.find<HTMLButtonElement>('.download').element.disabled).toBe(true);
        without.unmount();

        const changed = mountSection([], { changedAt: 9000, syncedAt: 500 });
        expect(changed.text()).toContain('Есть изменения, которых нет на сервере.');
        changed.unmount();
    });
});

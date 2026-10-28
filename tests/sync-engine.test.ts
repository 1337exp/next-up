import { describe, expect, it } from 'vitest';
import { removeNote } from '@/core/notes';
import { runSync, type PullResult, type PushResult, type SyncProvider } from '@/core/sync';
import { device, FakeServer, TODAY } from './sync-helpers';
import { note } from './helpers';

const live = (d: { notes: { deletedAt: number | null; id: string }[] }) => d.notes.filter((n) => n.deletedAt === null).map((n) => n.id).sort();
const sync = async (server: SyncProvider, host: ReturnType<typeof device>) => {
    const result = await runSync(server, host);
    if (!result.ok) throw new Error(`sync failed: ${result.error}`);
    return result.report;
};

describe('движок синхронизации', () => {
    it('первая синхронизация отправляет всё на пустой сервер, вторая ничего не делает', async () => {
        const server = new FakeServer();
        const a = device([note({ id: '1', due: TODAY, updatedAt: 5 })]);

        expect(await sync(server, a)).toMatchObject({ pushed: true, rounds: 1 });
        expect(server.calls.push).toBe(1);

        expect(await sync(server, a)).toMatchObject({ pushed: false, pulled: { added: 0, updated: 0 } });
        expect(server.calls.push).toBe(1); // лишних записей нет
    });

    it('пустое с пустым: ничего не отправляется', async () => {
        const server = new FakeServer();
        expect(await sync(server, device())).toMatchObject({ pushed: false });
        expect(server.calls.push).toBe(0);
    });

    it('второе устройство получает данные первого', async () => {
        const server = new FakeServer();
        const a = device([note({ id: '1', due: TODAY, body: 'с телефона', updatedAt: 5 })]);
        await sync(server, a);

        const b = device();
        expect(await sync(server, b)).toMatchObject({ pushed: false, pulled: { added: 1 } });
        expect(b.notes[0]!.body).toBe('с телефона');
    });

    it('правки разных заметок на двух устройствах сходятся без диалогов', async () => {
        const server = new FakeServer();
        const base = [note({ id: '1', due: TODAY, updatedAt: 1 }), note({ id: '2', due: TODAY, updatedAt: 1 })];
        const a = device(base);
        await sync(server, a);
        const b = device();
        await sync(server, b);

        a.notes = a.notes.map((n) => (n.id === '1' ? { ...n, body: 'правка A', updatedAt: 10 } : n));
        b.notes = b.notes.map((n) => (n.id === '2' ? { ...n, body: 'правка B', updatedAt: 11 } : n));

        await sync(server, a);
        await sync(server, b);
        await sync(server, a);

        for (const d of [a, b]) expect(Object.fromEntries(d.notes.map((n) => [n.id, n.body]))).toEqual({ 1: 'правка A', 2: 'правка B' });
    });

    it('одна заметка на двух устройствах: побеждает более поздняя правка', async () => {
        const server = new FakeServer();
        const a = device([note({ id: '1', due: TODAY, updatedAt: 1 })]);
        await sync(server, a);
        const b = device();
        await sync(server, b);

        a.notes = [{ ...a.notes[0]!, body: 'раньше', updatedAt: 10 }];
        b.notes = [{ ...b.notes[0]!, body: 'позже', updatedAt: 20 }];
        await sync(server, a);
        await sync(server, b);
        await sync(server, a);

        expect(a.notes[0]!.body).toBe('позже');
        expect(b.notes[0]!.body).toBe('позже');
    });

    it('удаление доходит до другого устройства и не воскресает от старой копии', async () => {
        const server = new FakeServer();
        const a = device([note({ id: '1', due: TODAY, updatedAt: 1 }), note({ id: '2', due: TODAY, updatedAt: 1 })]);
        await sync(server, a);
        const b = device();
        await sync(server, b);

        a.notes = a.notes.map((n) => (n.id === '1' ? removeNote(n, 50) : n));
        await sync(server, a);
        await sync(server, b); // у B ещё жива заметка 1, но удаление новее

        expect(live(a)).toEqual(['2']);
        expect(live(b)).toEqual(['2']);
        await sync(server, a);
        expect(live(a)).toEqual(['2']); // и обратно она не вернулась
    });

    it('конфликт записи (412): забираем чужое, сливаем и повторяем', async () => {
        const server = new FakeServer();
        const a = device([note({ id: 'a1', due: TODAY, updatedAt: 1 })]);
        const other = [note({ id: 'b1', due: TODAY, updatedAt: 2 })];
        // между нашим чтением и записью другое устройство успевает записать свою версию
        server.beforePush = () => server.store(other);

        const report = await sync(server, a);

        expect(report).toMatchObject({ pushed: true, rounds: 2 });
        expect(live(a)).toEqual(['a1', 'b1']);
        const onServer = JSON.parse(server.body!).notes.map((n: { id: string }) => n.id).sort();
        expect(onServer).toEqual(['a1', 'b1']); // ничьё не потеряно
    });

    it('конфликты не кончаются: после трёх кругов ошибка conflict', async () => {
        const server = new FakeServer();
        const a = device([note({ id: 'a1', due: TODAY, updatedAt: 1 })]);
        server.store([note({ id: 'x', due: TODAY })]);
        const stubborn: SyncProvider = { pull: () => server.pull(), push: async () => ({ ok: false, error: 'conflict' }) };

        expect(await runSync(stubborn, a)).toEqual({ ok: false, error: 'conflict' });
    });

    it('ошибки транспорта возвращаются кодом, список не меняется', async () => {
        const a = device([note({ id: '1', due: TODAY })]);
        const before = a.notes;
        for (const error of ['network', 'timeout', 'unauthorized', 'server', 'tooLarge'] as const) {
            const failing: SyncProvider = { pull: async (): Promise<PullResult> => ({ ok: false, error }), push: async (): Promise<PushResult> => ({ ok: true }) };
            expect(await runSync(failing, a)).toEqual({ ok: false, error });
        }
        const failingPush: SyncProvider = { pull: async () => ({ ok: true, body: null, etag: null }), push: async () => ({ ok: false, error: 'network' }) };
        expect(await runSync(failingPush, a)).toEqual({ ok: false, error: 'network' });
        expect(a.notes).toBe(before);
    });

    it('мусор на сервере и данные более новой версии не затираются', async () => {
        const a = device([note({ id: '1', due: TODAY })]);
        const server = new FakeServer();

        server.body = 'не json';
        expect(await runSync(server, a)).toEqual({ ok: false, error: 'badResponse' });
        server.body = '{"hello":1}';
        expect(await runSync(server, a)).toEqual({ ok: false, error: 'badResponse' });
        server.body = '{"app":"nextup","version":99,"notes":[]}';
        expect(await runSync(server, a)).toEqual({ ok: false, error: 'newer' });
        expect(server.calls.push).toBe(0);
    });

    it('файл старой версии на сервере поднимается до текущей', async () => {
        const server = new FakeServer();
        server.body = JSON.stringify({ format: 'nextup', schemaVersion: 1, exportedAt: 1, tasks: [{ id: 't', date: TODAY, note: 'из v1', checklist: [], recurrence: 'none', anchor: TODAY, done: false, rolled: false, updatedAt: 5 }] });
        server.version = 1;
        const a = device();

        expect(await sync(server, a)).toMatchObject({ pulled: { added: 1 }, pushed: false });
        expect(a.notes[0]!.body).toBe('из v1');
    });

    it('сервер не отдал ETag: движок так и сообщает провайдеру (запись безусловная), слияние всё равно было', async () => {
        const conditions: unknown[] = [];
        const provider: SyncProvider = {
            pull: async () => ({ ok: true, body: JSON.stringify({ app: 'nextup', version: 2, exportedAt: 1, notes: [note({ id: 'remote', due: TODAY, updatedAt: 3 })] }), etag: null }),
            push: async (_text, condition) => (conditions.push(condition), { ok: true }),
        };
        const a = device([note({ id: 'mine', due: TODAY, updatedAt: 4 })]);

        expect(await sync(provider, a)).toMatchObject({ pushed: true });
        expect(conditions).toEqual([{ etag: null, exists: true }]);
        expect(live(a)).toEqual(['mine', 'remote']);
    });

    it('два устройства, три круга: сходятся к одному набору', async () => {
        const server = new FakeServer();
        const a = device([note({ id: 'a', due: TODAY, updatedAt: 1 })], 1000);
        const b = device([note({ id: 'b', due: TODAY, updatedAt: 2 })], 2000);

        await sync(server, a);
        await sync(server, b);
        await sync(server, a);

        expect(live(a)).toEqual(['a', 'b']);
        expect(live(b)).toEqual(['a', 'b']);
    });

    it('повторы: оба устройства создают одни и те же записи, дублей нет', async () => {
        const server = new FakeServer();
        const first = note({ id: 'S@2026-10-07', due: '2026-10-07', repeat: { series: 'S', anchor: '2026-10-07', every: 1, unit: 'day' }, updatedAt: 1 });
        const a = device([first]);
        const b = device([first]);
        a.setNotes(a.notes); // оба независимо досоздали повторы до «сегодня»
        b.setNotes(b.notes);

        await sync(server, a);
        await sync(server, b);
        await sync(server, a);

        expect(a.notes.map((n) => n.id)).toEqual(b.notes.map((n) => n.id));
        expect(new Set(a.notes.map((n) => n.id)).size).toBe(a.notes.length);
        expect(a.notes.length).toBe(4); // 7, 8, 9, 10 октября
    });
});

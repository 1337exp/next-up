// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createNextupServer } from '../examples/server/server.mjs';
import { exportSnapshot } from '@/domain/snapshot';
import { createWebhookAdapter } from '@/sync/webhook';
import { makeTask } from './helpers';

// Настоящий демо-сервер и настоящий клиентский адаптер друг против друга: проверяет и протокол, и его описание.

let server: Server;
let dataDir: string;
let base: string;

beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'nextup-example-'));
    server = createNextupServer({ dataDir });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
});

const url = (token: string) => `${base}/wh_tasks_${token}`;
const snapshot = (exportedAt: number, note = 'задача') => exportSnapshot([makeTask({ id: 'a', date: '2026-10-20', note })], exportedAt);

describe('демо-сервер и клиентский адаптер', () => {
    it('на сервере пока ничего нет: 404 клиент превращает в «пусто»', async () => {
        const adapter = createWebhookAdapter(url('empty-token-1'));
        expect(await adapter.pull()).toEqual({ ok: true, snapshot: null });
    });

    it('загрузка и скачивание возвращают тот же снимок', async () => {
        const adapter = createWebhookAdapter(url('roundtrip-token'));
        const sent = snapshot(1000, 'привет');
        expect(await adapter.push(sent, { syncedAt: 0 })).toEqual({ ok: true });

        const pulled = await adapter.pull();
        expect(pulled).toEqual({ ok: true, snapshot: sent });
    });

    it('сервер новее нашей последней синхронизации: 409 с его меткой; с «force» записывается', async () => {
        const adapter = createWebhookAdapter(url('conflict-token'));
        expect(await adapter.push(snapshot(2000), { syncedAt: 0 })).toEqual({ ok: true }); // другое устройство

        // это устройство синхронизировалось на 1000, а на сервере уже 2000
        const result = await adapter.push(snapshot(3000, 'моя'), { syncedAt: 1000 });
        expect(result).toEqual({ ok: false, error: 'conflict', serverExportedAt: 2000 });
        expect(await adapter.pull()).toMatchObject({ snapshot: { exportedAt: 2000 } }); // не затёрто

        expect(await adapter.push(snapshot(3000, 'моя'), { syncedAt: 1000, force: true })).toEqual({ ok: true });
        expect(await adapter.pull()).toMatchObject({ snapshot: { exportedAt: 3000 } });
    });

    it('синхронизировались на актуальной версии: записывается без конфликта', async () => {
        const adapter = createWebhookAdapter(url('uptodate-token'));
        await adapter.push(snapshot(1000), { syncedAt: 0 });
        expect(await adapter.push(snapshot(2000), { syncedAt: 1000 })).toEqual({ ok: true });
    });

    it('чужой токен или неверный путь — «не найдено», а не чужие данные', async () => {
        const mine = createWebhookAdapter(url('private-token-1'));
        await mine.push(snapshot(1000, 'секрет'), { syncedAt: 0 });
        expect(await createWebhookAdapter(url('private-token-2')).pull()).toEqual({ ok: true, snapshot: null });

        for (const path of ['/', '/wh_tasks_', '/wh_tasks_short', '/wh_tasks_../../etc/passwd', '/other']) {
            expect((await fetch(`${base}${path}`)).status, path).toBe(404);
        }
    });

    it('не снимок и не JSON отвергаются, слишком большое тоже', async () => {
        const put = (body: string) => fetch(url('validate-token'), { method: 'PUT', body, headers: { 'Content-Type': 'application/json' } });
        expect((await put('не json')).status).toBe(400);
        expect((await put(JSON.stringify({ format: 'other', exportedAt: 1, tasks: [] }))).status).toBe(400);
        expect((await put(JSON.stringify({ format: 'nextup', tasks: [] }))).status).toBe(400); // нет exportedAt
        expect((await put('x'.repeat(5 * 1024 * 1024 + 1))).status).toBe(413);
    });

    it('CORS: предзапрос OPTIONS разрешает методы и заголовки протокола', async () => {
        const response = await fetch(url('cors-token-1'), { method: 'OPTIONS' });
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe('*');
        expect(response.headers.get('access-control-allow-methods')).toContain('PUT');
        expect(response.headers.get('access-control-allow-headers')).toContain('X-Nextup-Synced-At');
        expect(response.headers.get('access-control-allow-headers')).toContain('X-Nextup-Force');
    });

    it('другие методы: 405', async () => {
        expect((await fetch(url('method-token-1'), { method: 'DELETE' })).status).toBe(405);
    });

    it('снимки лежат файлами только по проверенным токенам внутри папки данных', async () => {
        const files = await readdir(dataDir);
        expect(files.length).toBeGreaterThan(0);
        for (const name of files) expect(name).toMatch(/^[A-Za-z0-9_-]{8,64}\.json$/);
    });

    it('клиент различает недоступный сервер, таймаут и плохой ответ', async () => {
        expect(await createWebhookAdapter('http://127.0.0.1:1/wh_tasks_unreachable').pull()).toEqual({ ok: false, error: 'network' });

        const slow = createWebhookAdapter(url('slow-token-123'), { timeoutMs: 20, fetchImpl: (_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))) });
        expect(await slow.pull()).toEqual({ ok: false, error: 'timeout' });

        const html = createWebhookAdapter(url('html-token-123'), { fetchImpl: async () => new Response('<html>', { status: 200 }) });
        expect(await html.pull()).toEqual({ ok: false, error: 'badResponse' });

        const denied = createWebhookAdapter(url('denied-token-1'), { fetchImpl: async () => new Response('', { status: 403 }) });
        expect(await denied.pull()).toEqual({ ok: false, error: 'unauthorized' });
        expect(await denied.push(snapshot(1), { syncedAt: 0 })).toEqual({ ok: false, error: 'unauthorized' });

        const broken = createWebhookAdapter(url('broken-token-1'), { fetchImpl: async () => new Response('', { status: 500 }) });
        expect(await broken.pull()).toEqual({ ok: false, error: 'server' });
    });
});

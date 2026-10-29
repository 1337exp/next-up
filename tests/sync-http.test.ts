// @vitest-environment node
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createNextupServer } from '../examples/server/server.mjs';
import { createHttpProvider, normalizeEndpoint } from '@/app/syncHttp';
import { removeNote } from '@/core/notes';
import { runSync } from '@/core/sync';
import { note } from './helpers';
import { device, TODAY } from './sync-helpers';

// Настоящий демо-сервер и настоящий клиентский провайдер друг против друга: проверяет и протокол, и его описание.

let server: Server;
let dataDir: string;
let base: string;

beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'nextup-sync-'));
    server = createNextupServer({ dataDir });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(dataDir, { recursive: true, force: true });
});

const provider = (token: string) => createHttpProvider({ url: `${base}/${token}` });
const ok = async (p: ReturnType<typeof provider>, host: ReturnType<typeof device>) => {
    const result = await runSync(p, host);
    if (!result.ok) throw new Error(result.error);
    return result.report;
};

describe('протокол: демо-сервер и HTTP-провайдер', () => {
    it('два устройства через настоящий сервер сходятся, в том числе удаление', async () => {
        const p = provider('token-converge-1');
        const a = device([note({ id: '1', due: TODAY, body: 'с телефона', updatedAt: 5 }), note({ id: '2', due: TODAY, updatedAt: 5 })]);
        const b = device();

        expect(await ok(p, a)).toMatchObject({ pushed: true });
        expect(await ok(p, b)).toMatchObject({ pushed: false, pulled: { added: 2 } });

        a.notes = a.notes.map((n) => (n.id === '2' ? removeNote(n, 50) : n));
        await ok(p, a);
        await ok(p, b);
        expect(b.notes.filter((n) => n.deletedAt === null).map((n) => n.id)).toEqual(['1']);
    });

    it('конфликт записи на настоящем сервере: 412, слияние, повтор', async () => {
        const url = 'token-conflict-1';
        const a = device([note({ id: 'a', due: TODAY, updatedAt: 1 })]);
        const b = device([note({ id: 'b', due: TODAY, updatedAt: 2 })]);
        await ok(provider(url), a);

        // B читает документ A, но перед его записью A успевает записать ещё одну заметку
        const real = provider(url);
        let interfered = false;
        const racing = {
            pull: real.pull,
            push: async (text: string, condition: Parameters<typeof real.push>[1]) => {
                if (!interfered) {
                    interfered = true;
                    a.notes = [...a.notes, note({ id: 'a2', due: TODAY, updatedAt: 3 })];
                    await ok(real, a);
                }
                return real.push(text, condition);
            },
        };

        expect(await runSync(racing, b)).toMatchObject({ ok: true, report: { rounds: 2, pushed: true } });
        await ok(real, a);
        for (const d of [a, b]) expect(d.notes.map((n) => n.id).sort()).toEqual(['a', 'a2', 'b']);
    });

    it('ETag меняется с содержимым и виден в CORS; условные запросы работают', async () => {
        const url = `${base}/token-etag-12345`;
        const put = (headers: Record<string, string>, body = '{"app":"nextup","version":2,"exportedAt":1,"notes":[]}') => fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body });

        const created = await put({ 'If-None-Match': '*' });
        expect(created.status).toBe(201);
        const etag = created.headers.get('etag')!;
        expect(etag).toMatch(/^"[0-9a-f]{32}"$/);

        expect((await put({ 'If-None-Match': '*' })).status).toBe(412); // уже есть
        expect((await put({ 'If-Match': '"stale"' })).status).toBe(412); // устаревшая метка
        const updated = await put({ 'If-Match': etag }, '{"app":"nextup","version":2,"exportedAt":2,"notes":[]}');
        expect(updated.status).toBe(200);
        expect(updated.headers.get('etag')).not.toBe(etag);

        const got = await fetch(url);
        expect(got.headers.get('etag')).toBe(updated.headers.get('etag'));

        const preflight = await fetch(url, { method: 'OPTIONS' });
        expect(preflight.status).toBe(204);
        expect(preflight.headers.get('access-control-allow-headers')).toMatch(/If-Match/i);
        expect(preflight.headers.get('access-control-expose-headers')).toMatch(/ETag/i);
    });

    it('чужие адреса и мусор: 404, 400; пустой сервер даёт 404 на GET', async () => {
        expect((await fetch(`${base}/short`)).status).toBe(404);
        expect((await fetch(`${base}/token-empty-12345`)).status).toBe(404);
        expect((await fetch(`${base}/token-garbage-123`, { method: 'PUT', body: 'не json' })).status).toBe(400);
        expect((await fetch(`${base}/token-garbage-123`, { method: 'DELETE' })).status).toBe(405);
    });

    it('документы лежат по файлу на токен', async () => {
        expect((await readdir(dataDir)).filter((f) => f.endsWith('.json')).length).toBeGreaterThanOrEqual(2);
        expect((await readdir(dataDir)).some((f) => f.endsWith('.tmp'))).toBe(false); // запись целиком, без хвостов
    });
});

describe('HTTP-провайдер', () => {
    const fakeFetch = (handler: (input: string, init: RequestInit) => Response | Promise<Response>) => ((url: string, init: RequestInit) => Promise.resolve(handler(url, init))) as unknown as typeof fetch;

    it('отправляет Authorization и условные заголовки, как положено', async () => {
        const seen: Record<string, string>[] = [];
        const p = createHttpProvider({
            url: 'https://example.com/doc',
            authorization: 'Bearer abc',
            fetchImpl: fakeFetch((_, init) => (seen.push(Object.fromEntries(new Headers(init.headers))), new Response('', { status: 200 }))),
        });

        await p.push('{}', { etag: '"v1"', exists: true });
        await p.push('{}', { etag: null, exists: false });
        await p.push('{}', { etag: null, exists: true });

        expect(seen[0]).toMatchObject({ authorization: 'Bearer abc', 'if-match': '"v1"' });
        expect(seen[1]).toMatchObject({ 'if-none-match': '*' });
        expect(seen[2]!['if-match']).toBeUndefined();
        expect(seen[2]!['if-none-match']).toBeUndefined();
    });

    it('переводит ответы в коды ошибок', async () => {
        const status = (code: number, body = '') => createHttpProvider({ url: 'https://x.test/d', fetchImpl: fakeFetch(() => new Response(body, { status: code })) });

        expect(await status(404).pull()).toEqual({ ok: true, body: null, etag: null });
        expect(await status(401).pull()).toEqual({ ok: false, error: 'unauthorized' });
        expect(await status(403).pull()).toEqual({ ok: false, error: 'unauthorized' });
        expect(await status(500).pull()).toEqual({ ok: false, error: 'server' });
        expect(await status(412).push('{}', { etag: '"a"', exists: true })).toEqual({ ok: false, error: 'conflict' });
        expect(await status(413).push('{}', { etag: null, exists: false })).toEqual({ ok: false, error: 'tooLarge' });
        expect(await status(500).push('{}', { etag: null, exists: false })).toEqual({ ok: false, error: 'server' });
    });

    it('сеть, таймаут и слишком большой ответ', async () => {
        const down = createHttpProvider({ url: 'https://x.test/d', fetchImpl: (() => Promise.reject(new TypeError('failed'))) as unknown as typeof fetch });
        expect(await down.pull()).toEqual({ ok: false, error: 'network' });

        const slow = createHttpProvider({
            url: 'https://x.test/d',
            timeoutMs: 20,
            fetchImpl: ((_: string, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))))) as unknown as typeof fetch,
        });
        expect(await slow.pull()).toEqual({ ok: false, error: 'timeout' });

        const big = createHttpProvider({ url: 'https://x.test/d', maxBytes: 5, fetchImpl: fakeFetch(() => new Response('123456789')) });
        expect(await big.pull()).toEqual({ ok: false, error: 'tooLarge' });
    });

    it('не ходит с куками и не следует перенаправлениям', async () => {
        let init: RequestInit = {};
        const p = createHttpProvider({ url: 'https://x.test/d', fetchImpl: fakeFetch((_, i) => ((init = i), new Response('{}'))) });
        await p.pull();
        expect(init).toMatchObject({ credentials: 'omit', redirect: 'error', cache: 'no-store' });
    });
});

describe('адрес', () => {
    it('https и http только для localhost; без логина и пароля', () => {
        expect(normalizeEndpoint('https://example.com/dav/notes.json')).toBe('https://example.com/dav/notes.json');
        expect(normalizeEndpoint('  http://localhost:8787/token12345 ')).toBe('http://localhost:8787/token12345');
        expect(normalizeEndpoint('http://127.0.0.1:8787/t')).toBe('http://127.0.0.1:8787/t');
        expect(normalizeEndpoint('http://example.com/x')).toBeNull();
        expect(normalizeEndpoint('ftp://example.com/x')).toBeNull();
        expect(normalizeEndpoint('https://user:pass@example.com/x')).toBeNull();
        expect(normalizeEndpoint('не адрес')).toBeNull();
        expect(normalizeEndpoint('')).toBeNull();
    });
});

import { MAX_IMPORT_BYTES } from '@/domain/transfer';
import { SNAPSHOT_FORMAT, type Snapshot } from '@/domain/types';
import type { PullResult, PushOptions, PushResult, SyncAdapter, SyncFailure } from './types';

/** Заголовки протокола (см. examples/README.md). */
export const HEADER_SYNCED_AT = 'X-Nextup-Synced-At';
export const HEADER_FORCE = 'X-Nextup-Force';

export interface WebhookOptions {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

/** Снимок из ответа сервера: проверяем только оболочку, записи разберёт и проверит импорт. */
export function parseServerSnapshot(raw: unknown): Snapshot | null {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
    const value = raw as Record<string, unknown>;
    if (value.format !== SNAPSHOT_FORMAT || typeof value.exportedAt !== 'number' || !Number.isFinite(value.exportedAt)) return null;
    if (!Array.isArray(value.tasks)) return null;
    return value as unknown as Snapshot;
}

function failureOf(status: number): SyncFailure {
    return status === 401 || status === 403 ? 'unauthorized' : 'server';
}

/**
 * Адаптер вебхука: один адрес, на котором лежит снимок (`GET` отдаёт, `PUT` заменяет). Токен — часть адреса
 * (`https://host/wh_tasks_ТОКЕН`), отдельных заголовков авторизации нет. Ошибки не бросаются, а возвращаются кодом.
 */
export function createWebhookAdapter(endpoint: string, { fetchImpl = (...args) => fetch(...args), timeoutMs = 15_000 }: WebhookOptions = {}): SyncAdapter {
    async function request(init: RequestInit): Promise<{ response: Response } | { error: SyncFailure }> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetchImpl(endpoint, { ...init, signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error' });
            return { response };
        } catch (error) {
            return { error: controller.signal.aborted || (error as Error)?.name === 'AbortError' ? 'timeout' : 'network' };
        } finally {
            clearTimeout(timer);
        }
    }

    async function readJson(response: Response): Promise<{ value: unknown } | { error: SyncFailure }> {
        const length = Number(response.headers.get('content-length'));
        if (Number.isFinite(length) && length > MAX_IMPORT_BYTES) return { error: 'tooLarge' };

        let text: string;
        try {
            text = await response.text();
        } catch {
            return { error: 'network' };
        }
        if (text.length > MAX_IMPORT_BYTES) return { error: 'tooLarge' };

        try {
            return { value: JSON.parse(text) };
        } catch {
            return { error: 'badResponse' };
        }
    }

    return {
        async pull(): Promise<PullResult> {
            const res = await request({ method: 'GET', headers: { Accept: 'application/json' } });
            if ('error' in res) return { ok: false, error: res.error };

            const { response } = res;
            if (response.status === 404) return { ok: true, snapshot: null };
            if (!response.ok) return { ok: false, error: failureOf(response.status) };

            const body = await readJson(response);
            if ('error' in body) return { ok: false, error: body.error };

            const snapshot = parseServerSnapshot(body.value);
            return snapshot ? { ok: true, snapshot } : { ok: false, error: 'badResponse' };
        },

        async push(snapshot: Snapshot, { syncedAt, force = false }: PushOptions): Promise<PushResult> {
            const headers: Record<string, string> = { 'Content-Type': 'application/json', [HEADER_SYNCED_AT]: String(syncedAt) };
            if (force) headers[HEADER_FORCE] = '1';

            const res = await request({ method: 'PUT', headers, body: JSON.stringify(snapshot) });
            if ('error' in res) return { ok: false, error: res.error };

            const { response } = res;
            if (response.status === 409) {
                const body = await readJson(response);
                const exportedAt = 'value' in body && typeof (body.value as { exportedAt?: unknown })?.exportedAt === 'number' ? (body.value as { exportedAt: number }).exportedAt : 0;
                return { ok: false, error: 'conflict', serverExportedAt: exportedAt };
            }
            if (!response.ok) return { ok: false, error: failureOf(response.status) };
            return { ok: true };
        },
    };
}

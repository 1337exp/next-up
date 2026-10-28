import type { PullResult, PushCondition, PushResult, SyncFailure, SyncProvider } from '@/core/sync';

/**
 * Адрес документа: `https://…` или `http://localhost` (для пробы с демо-сервером). Токен — часть адреса или заголовок
 * Authorization. Логин и пароль в самом адресе не принимаем: они попали бы в историю и журналы.
 * Возвращает нормализованный адрес или `null`.
 */
export function normalizeEndpoint(text: string): string | null {
    let url: URL;
    try {
        url = new URL(text.trim());
    } catch {
        return null;
    }
    if (url.username || url.password) return null;
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname.endsWith('.localhost');
    if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return url.href;
    return null;
}

export interface HttpProviderOptions {
    url: string;
    /** Значение заголовка Authorization целиком (`Bearer …`, `Basic …`); пусто — не отправлять. */
    authorization?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxBytes?: number;
}

const failureOf = (status: number): SyncFailure => (status === 401 || status === 403 ? 'unauthorized' : 'server');

/**
 * Провайдер на обычном HTTP с условными запросами (RFC 9110): `GET` и `PUT` одного документа, `ETag` /
 * `If-Match` / `If-None-Match`. То же умеют WebDAV (Nextcloud), S3 по предподписанной ссылке и любой файловый
 * сервер с ETag. Ошибки возвращаются кодом, текст ответа наружу не отдаётся: адрес может содержать токен.
 */
export function createHttpProvider({ url, authorization = '', fetchImpl = (...args) => fetch(...args), timeoutMs = 15_000, maxBytes = 5_000_000 }: HttpProviderOptions): SyncProvider {
    async function request(init: RequestInit): Promise<{ response: Response } | { error: SyncFailure }> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const headers = new Headers(init.headers);
            if (authorization) headers.set('Authorization', authorization);
            const response = await fetchImpl(url, { ...init, headers, signal: controller.signal, cache: 'no-store', credentials: 'omit', redirect: 'error' });
            return { response };
        } catch (error) {
            return { error: controller.signal.aborted || (error as Error)?.name === 'AbortError' ? 'timeout' : 'network' };
        } finally {
            clearTimeout(timer);
        }
    }

    return {
        async pull(): Promise<PullResult> {
            const res = await request({ method: 'GET', headers: { Accept: 'application/json' } });
            if ('error' in res) return { ok: false, error: res.error };
            const { response } = res;

            if (response.status === 404) return { ok: true, body: null, etag: null };
            if (!response.ok) return { ok: false, error: failureOf(response.status) };

            const length = Number(response.headers.get('content-length'));
            if (Number.isFinite(length) && length > maxBytes) return { ok: false, error: 'tooLarge' };
            let body: string;
            try {
                body = await response.text();
            } catch {
                return { ok: false, error: 'network' };
            }
            if (body.length > maxBytes) return { ok: false, error: 'tooLarge' };

            // null: страница не видит ETag (сервер не отдал Access-Control-Expose-Headers); тогда запись безусловная
            return { ok: true, body, etag: response.headers.get('ETag') };
        },

        async push(text: string, { etag, exists }: PushCondition): Promise<PushResult> {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (etag) headers['If-Match'] = etag;
            else if (!exists) headers['If-None-Match'] = '*';

            const res = await request({ method: 'PUT', headers, body: text });
            if ('error' in res) return { ok: false, error: res.error };
            if (res.response.status === 412) return { ok: false, error: 'conflict' };
            if (res.response.status === 413) return { ok: false, error: 'tooLarge' };
            return res.response.ok ? { ok: true } : { ok: false, error: failureOf(res.response.status) };
        },
    };
}

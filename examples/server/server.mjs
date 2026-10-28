// Демо-сервер синхронизации для Next Up: один файл, без зависимостей (Node 18+).
// Хранит по одному JSON-документу на токен и умеет GET и PUT с ETag (условные запросы, RFC 9110). Протокол: examples/README.md.
//
//   node examples/server/server.mjs            # слушает http://localhost:8787
//   PORT=9000 DATA_DIR=./my-data node examples/server/server.mjs
//
// Это ПРИМЕР для знакомства с протоколом, а не готовый сервис: нет шифрования, учёта пользователей и защиты
// от перебора токенов. Для настоящего использования ставьте его за https и берите длинный случайный токен.
// То же самое умеют WebDAV (Nextcloud) и любой файловый сервер с ETag: отдельный сервер может не понадобиться.

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 5 * 1024 * 1024;
/** Токен — путь: `/<токен>`, от 8 до 64 символов. */
const PATH_RE = /^\/([A-Za-z0-9_-]{8,64})$/;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-Match, If-None-Match, Authorization',
    // без этого страница не увидит ETag в ответе, а значит не сможет написать If-Match
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '600',
};

const etagOf = (text) => `"${createHash('sha256').update(text).digest('hex').slice(0, 32)}"`;

function send(res, status, text = '', extra = {}) {
    res.writeHead(status, { ...CORS, 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(text), ...(text ? { 'Content-Type': 'application/json; charset=utf-8' } : {}), ...extra });
    res.end(text);
}

async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) throw Object.assign(new Error('too large'), { code: 'TOO_LARGE' });
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

async function readStored(file) {
    try {
        return await readFile(file, 'utf8');
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
}

/**
 * @param {{ dataDir?: string, log?: (line: string) => void }} [options]
 * @returns {import('node:http').Server}
 */
export function createNextupServer({ dataDir = resolve('data'), log = () => {} } = {}) {
    return createServer(async (req, res) => {
        try {
            if (req.method === 'OPTIONS') return send(res, 204);

            const match = PATH_RE.exec(new URL(req.url ?? '/', 'http://x').pathname);
            if (!match) return send(res, 404);
            const file = join(dataDir, `${match[1]}.json`);
            const stored = await readStored(file);
            const etag = stored === null ? null : etagOf(stored);
            log(`${req.method} ${match[1].slice(0, 4)}… etag=${etag ?? '-'}`);

            if (req.method === 'GET') return stored === null ? send(res, 404) : send(res, 200, stored, { ETag: etag });

            if (req.method === 'PUT') {
                // условия: If-Match — «пока документ тот, что я видел»; If-None-Match: * — «пока документа нет»
                const ifMatch = req.headers['if-match'];
                const ifNoneMatch = req.headers['if-none-match'];
                if (ifMatch !== undefined && ifMatch !== etag) return send(res, 412);
                if (ifNoneMatch === '*' && stored !== null) return send(res, 412);

                const body = await readBody(req);
                try {
                    JSON.parse(body);
                } catch {
                    return send(res, 400);
                }

                await mkdir(dataDir, { recursive: true });
                await writeFile(`${file}.tmp`, body);
                await rename(`${file}.tmp`, file); // запись целиком: читатель не увидит половину файла
                return send(res, stored === null ? 201 : 200, '', { ETag: etagOf(body) });
            }

            return send(res, 405, '', { Allow: 'GET, PUT, OPTIONS' });
        } catch (error) {
            send(res, error.code === 'TOO_LARGE' ? 413 : 500);
        }
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href || process.argv[1] === fileURLToPath(import.meta.url)) {
    const port = Number(process.env.PORT ?? 8787);
    const dataDir = resolve(process.env.DATA_DIR ?? join(fileURLToPath(new URL('.', import.meta.url)), 'data'));
    createNextupServer({ dataDir, log: console.log }).listen(port, () => console.log(`Next Up demo server: http://localhost:${port}/<токен>  (данные: ${dataDir})`));
}

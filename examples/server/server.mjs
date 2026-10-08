// Демо-сервер синхронизации для Next Up: один файл, без зависимостей (Node 18+).
// Хранит по одному JSON-снимку на токен. Протокол и ограничения: examples/README.md.
//
//   node examples/server/server.mjs            # слушает http://localhost:8787
//   PORT=9000 DATA_DIR=./my-data node examples/server/server.mjs
//
// Это ПРИМЕР для знакомства с протоколом, а не готовый сервис: нет шифрования, учёта пользователей и защиты
// от перебора токенов. Для настоящего использования ставьте его за https и берите длинный случайный токен.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const PATH_RE = /^\/wh_tasks_([A-Za-z0-9_-]{8,64})$/;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Nextup-Synced-At, X-Nextup-Force',
    'Access-Control-Max-Age': '600',
};

function send(res, status, body) {
    const text = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(text) });
    res.end(text);
}

/** Снимок Next Up: проверяем оболочку; записи разберёт и проверит само приложение при скачивании. */
function isSnapshot(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && value.format === 'nextup' && Number.isFinite(value.exportedAt) && Array.isArray(value.tasks);
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
        return JSON.parse(await readFile(file, 'utf8'));
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
            const url = new URL(req.url ?? '/', 'http://localhost');
            const match = PATH_RE.exec(url.pathname);
            const mask = (token) => `${token.slice(0, 3)}…`;

            if (req.method === 'OPTIONS') {
                res.writeHead(204, CORS);
                return void res.end();
            }
            if (!match) return send(res, 404, { error: 'not-found' });

            const token = match[1];
            // имя файла собираем только из проверенного токена (буквы, цифры, «_», «-»): выйти из папки нельзя
            const file = join(dataDir, `${token}.json`);

            if (req.method === 'GET') {
                const stored = await readStored(file);
                log(`GET ${mask(token)} ${stored ? 200 : 404}`);
                return stored ? send(res, 200, stored) : send(res, 404, { error: 'empty' });
            }

            if (req.method === 'PUT') {
                let body;
                try {
                    body = JSON.parse(await readBody(req));
                } catch (error) {
                    if (error.code === 'TOO_LARGE') return send(res, 413, { error: 'too-large' });
                    return send(res, 400, { error: 'bad-json' });
                }
                if (!isSnapshot(body)) return send(res, 400, { error: 'bad-snapshot' });

                // Клиент говорит, с каким снимком он синхронизировался в последний раз (мс); если с тех пор на сервере
                // появилось что-то новее, значит данные загрузили с другого устройства: не затираем без подтверждения.
                const syncedAt = Number(req.headers['x-nextup-synced-at'] ?? 0) || 0;
                const force = req.headers['x-nextup-force'] === '1';
                const stored = await readStored(file);

                if (stored && Number(stored.exportedAt) > syncedAt && !force) {
                    log(`PUT ${mask(token)} 409`);
                    return send(res, 409, { error: 'server-newer', exportedAt: stored.exportedAt });
                }

                await mkdir(dirname(file), { recursive: true });
                const temp = `${file}.${process.pid}.tmp`;
                await writeFile(temp, JSON.stringify(body));
                await rename(temp, file); // запись целиком: оборванный запрос не оставит половину файла
                log(`PUT ${mask(token)} 200 tasks=${body.tasks.length}${force ? ' force' : ''}`);
                return send(res, 200, { ok: true, exportedAt: body.exportedAt });
            }

            return send(res, 405, { error: 'method-not-allowed' });
        } catch (error) {
            log(`ERROR ${error?.message ?? error}`);
            return send(res, 500, { error: 'server-error' });
        }
    });
}

// запуск из командной строки
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.env.PORT ?? 8787);
    const dataDir = resolve(process.env.DATA_DIR ?? join(dirname(fileURLToPath(import.meta.url)), 'data'));
    createNextupServer({ dataDir, log: (line) => console.log(new Date().toISOString(), line) }).listen(port, () => {
        console.log(`Next Up demo server: http://localhost:${port}/wh_tasks_<TOKEN>  (data: ${dataDir})`);
    });
}

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/** Файлы, которые не нужны в офлайн-оболочке: сам worker и карты исходников. */
const SKIP = /(^|\/)sw\.js$|\.map$/;

/** Все файлы сборки как пути относительно папки, с `/` в качестве разделителя. */
export function listFiles(dir: string, root = dir): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? listFiles(full, root) : [relative(root, full).split(sep).join('/')];
    });
}

/** Что класть в кеш: всё, кроме worker и карт; `index.html` первым. Порядок стабилен, чтобы версия не прыгала. */
export function precacheList(files: readonly string[]): string[] {
    const list = files.filter((file) => !SKIP.test(file)).sort();
    return [...list.filter((f) => f === 'index.html'), ...list.filter((f) => f !== 'index.html')];
}

/** Версия кеша: от содержимого файлов и кода worker, поэтому меняется, только когда изменилась сборка или worker. */
export function cacheVersion(dir: string, list: readonly string[], workerSource = ''): string {
    const hash = createHash('sha256').update(workerSource);
    for (const file of list) hash.update(file).update(readFileSync(join(dir, file)));
    return hash.digest('hex').slice(0, 12);
}

/** Подставляет список файлов и версию в собранный `sw.js`. */
export function fillWorker(source: string, list: readonly string[], version: string): string {
    return source.replace('/*PRECACHE*/ []', JSON.stringify(list)).replace('__VERSION__', version);
}

/** Плагин сборки: после записи файлов пишет в `dist/sw.js` список для офлайн-кеша. */
export function precache(): Plugin {
    let outDir = 'dist';
    return {
        name: 'nextup-precache',
        apply: 'build',
        configResolved(config) {
            outDir = config.build.outDir;
        },
        closeBundle() {
            const swPath = join(outDir, 'sw.js');
            const list = precacheList(listFiles(outDir));
            const source = readFileSync(swPath, 'utf8');
            writeFileSync(swPath, fillWorker(source, list, cacheVersion(outDir, list, source)));
        },
    };
}

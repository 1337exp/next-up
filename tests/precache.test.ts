// @vitest-environment node
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheVersion, fillWorker, listFiles, precacheList } from '../build/precache';

function dist(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), 'nextup-dist-'));
    for (const [name, text] of Object.entries(files)) {
        mkdirSync(join(dir, name, '..'), { recursive: true });
        writeFileSync(join(dir, name), text);
    }
    return dir;
}

describe('офлайн-кеш: сборка', () => {
    it('в списке всё нужное, без самого worker и карт; index.html первым, порядок стабилен', () => {
        const dir = dist({ 'index.html': '<html>', 'sw.js': '// worker', 'manifest.webmanifest': '{}', 'assets/app-abc.js': 'x', 'assets/app-abc.js.map': '{}', 'icons/icon-192.png': 'png' });
        expect(precacheList(listFiles(dir))).toEqual(['index.html', 'assets/app-abc.js', 'icons/icon-192.png', 'manifest.webmanifest']);
    });

    it('версия меняется вместе с содержимым и только с ним', () => {
        const a = dist({ 'index.html': 'one', 'assets/x.js': '1' });
        const b = dist({ 'index.html': 'one', 'assets/x.js': '1' });
        const c = dist({ 'index.html': 'one', 'assets/x.js': '2' });
        const version = (d: string) => cacheVersion(d, precacheList(listFiles(d)));

        expect(version(a)).toBe(version(b)); // та же сборка в другой папке — та же версия
        expect(version(a)).not.toBe(version(c));
        expect(version(a)).toMatch(/^[0-9a-f]{12}$/);
        // правка самого worker тоже даёт новую версию кеша
        expect(cacheVersion(a, precacheList(listFiles(a)), 'worker v2')).not.toBe(version(a));
    });

    it('в worker подставляются список и версия', () => {
        const source = "const VERSION = '__VERSION__';\nconst PRECACHE = /*PRECACHE*/ [];\n";
        const filled = fillWorker(source, ['index.html', 'assets/a.js'], 'abc123');
        expect(filled).toContain("const VERSION = 'abc123';");
        expect(filled).toContain('const PRECACHE = ["index.html","assets/a.js"];');
    });
});

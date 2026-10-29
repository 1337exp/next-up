import { uuid } from '@1337exp/taoux/ids';

function fnv1a(text: string, seed: number): string {
    let hash = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Одинаковый ключ — одинаковый id: миграции и повторный импорт не должны плодить новые записи. */
export function stableId(prefix: string, key: string): string {
    return `${prefix}-${fnv1a(key, 2166136261)}${fnv1a(key, 0x9747b28c)}`;
}

/** Id новой записи: UUID v4 из TaoUX (работает и вне безопасного контекста, например по http в локальной сети). */
export function newId(): string {
    return uuid();
}

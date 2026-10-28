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

export function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    // запасной вариант для окружений без crypto.randomUUID
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 7);
}

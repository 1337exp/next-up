export function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    // запасной вариант для окружений без crypto.randomUUID
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 11) + Math.random().toString(36).slice(2, 7);
}

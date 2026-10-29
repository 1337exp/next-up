/** Шаг миграции: чистая функция «документ версии n → документ версии n + 1»; `invalid` — сколько записей отброшено. */
export type Step = (doc: unknown) => { doc: unknown; invalid: number };

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

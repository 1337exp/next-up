import { computed, ref } from 'vue';
import { FALLBACK_LOCALE, LOCALES, type LocaleCode } from './locales';
import type ru from './locales/ru';

type Paths<T, P extends string = ''> = {
    [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

/** Все допустимые ключи словаря: 'ui.button.save', 'tasks.date.today', ... */
export type MessageKey = Paths<typeof ru>;
export type MessageArgs = readonly (string | number)[];

const current = ref<LocaleCode>(FALLBACK_LOCALE);

/** Применить язык интерфейса: все `t()` в шаблонах перерисуются, `<html lang>` обновится. */
export function applyLocale(code: LocaleCode): void {
    current.value = code;
    if (typeof document !== 'undefined') document.documentElement.lang = code;
}

function lookup(dict: unknown, path: string): string | undefined {
    let cur: unknown = dict;
    for (const part of path.split('.')) {
        if (cur === null || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[part];
    }
    return typeof cur === 'string' ? cur : undefined;
}

/** Перевод без реактивности: нужен там, где язык известен явно (и в тестах). */
export function translate(code: LocaleCode, key: MessageKey, args: MessageArgs = []): string {
    // запасной вариант: английский, затем сам ключ (чтобы пропуск было видно)
    const template = lookup(LOCALES[code], key) ?? lookup(LOCALES[FALLBACK_LOCALE], key) ?? key;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export function useI18n() {
    return {
        locale: computed(() => current.value),
        // читает current.value внутри, поэтому шаблон перерисуется при смене языка
        t: (key: MessageKey, args?: MessageArgs) => translate(current.value, key, args),
    };
}

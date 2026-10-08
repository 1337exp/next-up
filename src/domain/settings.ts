import { isLocaleCode, type LocaleCode } from '@/i18n/locales';

export const SETTINGS_SCHEMA_VERSION = 1;

/** «Авто» — на всю ширину окна; «Мини» — узкая колонка по центру. */
export const WIDTH_MODES = ['auto', 'mini'] as const;
export type WidthMode = (typeof WIDTH_MODES)[number];
export const MINI_WIDTH_PX = 400;

export function isWidthMode(value: unknown): value is WidthMode {
    return typeof value === 'string' && (WIDTH_MODES as readonly string[]).includes(value);
}

export interface Settings {
    schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
    /** `null` — язык ещё не выбран (показываем экран первого запуска). */
    locale: LocaleCode | null;
    width: WidthMode;
    /** Сворачивать содержимое задач, до которых больше 21 дня (старый autoHide). */
    hideFarTasks: boolean;
    /** Спрашивать подтверждение при снятии отметки с пункта: снятие стирает время отметки. */
    confirmUncheck: boolean;
    /** Точка расширения для синхронизации; пустая строка — выключено. */
    sync: { endpoint: string };
}

export function defaultSettings(): Settings {
    return {
        schemaVersion: SETTINGS_SCHEMA_VERSION,
        locale: null,
        width: 'mini',
        hideFarTasks: false,
        confirmUncheck: true,
        sync: { endpoint: '' },
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Терпимый разбор: любое повреждённое поле заменяется значением по умолчанию, остальные сохраняются. */
export function parseSettings(raw: unknown): Settings {
    const result = defaultSettings();
    if (!isRecord(raw)) return result;

    if (isLocaleCode(raw.locale)) result.locale = raw.locale;
    if (isWidthMode(raw.width)) result.width = raw.width;
    if (typeof raw.hideFarTasks === 'boolean') result.hideFarTasks = raw.hideFarTasks;
    if (typeof raw.confirmUncheck === 'boolean') result.confirmUncheck = raw.confirmUncheck;
    if (isRecord(raw.sync) && typeof raw.sync.endpoint === 'string') result.sync.endpoint = raw.sync.endpoint;

    return result;
}

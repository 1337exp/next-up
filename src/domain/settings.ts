import { isLocaleCode, type LocaleCode } from '@/i18n/locales';

export const SETTINGS_SCHEMA_VERSION = 1;

/** «Авто» — на всю ширину окна; «Мини» — узкая колонка по центру. */
export const WIDTH_MODES = ['auto', 'mini'] as const;
export type WidthMode = (typeof WIDTH_MODES)[number];
export const MINI_WIDTH_PX = 400;

/** Масштаб шрифта в процентах: 100 — как задумано в теме, остальные — для мелкого экрана или для глаз. */
export const FONT_SCALES = [90, 100, 120, 140] as const;
export type FontScale = (typeof FONT_SCALES)[number];

export function isFontScale(value: unknown): value is FontScale {
    return typeof value === 'number' && (FONT_SCALES as readonly number[]).includes(value);
}

export function isWidthMode(value: unknown): value is WidthMode {
    return typeof value === 'string' && (WIDTH_MODES as readonly string[]).includes(value);
}

export interface Settings {
    schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
    /** `null` — язык ещё не выбран (показываем экран первого запуска). */
    locale: LocaleCode | null;
    width: WidthMode;
    /** Общий масштаб интерфейса, %: шрифты, отступы, панель свайпа. Поверх него работают размеры ниже. */
    uiScale: FontScale;
    /** Размер текста заметки, %. */
    noteScale: FontScale;
    /** Размер пунктов списка (подпись и время отметки), %. */
    itemScale: FontScale;
    /** Размер заголовка карточки (бейджи и дата), %. */
    headerScale: FontScale;
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
        uiScale: 100,
        noteScale: 100,
        itemScale: 100,
        headerScale: 100,
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
    if (isFontScale(raw.uiScale)) result.uiScale = raw.uiScale;
    if (isFontScale(raw.noteScale)) result.noteScale = raw.noteScale;
    if (isFontScale(raw.itemScale)) result.itemScale = raw.itemScale;
    if (isFontScale(raw.headerScale)) result.headerScale = raw.headerScale;
    if (typeof raw.hideFarTasks === 'boolean') result.hideFarTasks = raw.hideFarTasks;
    if (typeof raw.confirmUncheck === 'boolean') result.confirmUncheck = raw.confirmUncheck;
    if (isRecord(raw.sync) && typeof raw.sync.endpoint === 'string') result.sync.endpoint = raw.sync.endpoint;

    return result;
}

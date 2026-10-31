import { reactive, watch } from 'vue';
import { defineStore } from 'pinia';
import { taoPalettes } from '@1337exp/taoui';
import { createSavedStorage } from '@1337exp/taoux/storage';

export const MODES = ['auto', 'light', 'dark'] as const;
export type Mode = (typeof MODES)[number];

export interface Settings {
    /** Тема: светлая, тёмная или как в системе. */
    mode: Mode;
    /** Имя палитры TaoUI; пустая строка — стандартная. */
    palette: string;
    /** Недельная лента над списком «Скоро». */
    showWeek: boolean;
    /** Длинный свайп влево сразу запускает последнее действие строки («Изменить»). */
    fullSwipe: boolean;
    /** Поиск без поправки на опечатки: слово находится только как подстрока. */
    exactSearch: boolean;
    /** Раз в день, когда сменилась дата, оповещать о заметках на сегодня (нужно разрешение браузера). */
    notifyToday: boolean;
    /** Дата (yyyy-mm-dd), за которую оповещение уже обработано; пустая строка — ни за какую. */
    lastNotified: string;
    /** Синхронизация между устройствами (см. docs/PLAN-v3.md §9). */
    sync: { enabled: boolean; url: string; authorization: string };
}

export const SETTINGS_KEY = 'nextup.settings';

export function defaultSettings(): Settings {
    return { mode: 'dark', palette: '', showWeek: true, fullSwipe: true, exactSearch: false, notifyToday: false, lastNotified: '', sync: { enabled: false, url: '', authorization: '' } };
}

const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as readonly string[]).includes(v);
const isPalette = (v: unknown): v is string => typeof v === 'string' && taoPalettes.some((p) => p.name === v);

/** Терпимый разбор: повреждённое поле заменяется значением по умолчанию, остальные сохраняются. */
export function parseSettings(raw: unknown): Settings {
    const result = defaultSettings();
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return result;
    const record = raw as Record<string, unknown>;
    if (isMode(record.mode)) result.mode = record.mode;
    if (isPalette(record.palette)) result.palette = record.palette;
    if (typeof record.showWeek === 'boolean') result.showWeek = record.showWeek;
    if (typeof record.fullSwipe === 'boolean') result.fullSwipe = record.fullSwipe;
    if (typeof record.exactSearch === 'boolean') result.exactSearch = record.exactSearch;
    if (typeof record.notifyToday === 'boolean') result.notifyToday = record.notifyToday;
    if (typeof record.lastNotified === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.lastNotified)) result.lastNotified = record.lastNotified;
    if (typeof record.sync === 'object' && record.sync !== null) {
        const sync = record.sync as Record<string, unknown>;
        if (typeof sync.enabled === 'boolean') result.sync.enabled = sync.enabled;
        if (typeof sync.url === 'string') result.sync.url = sync.url;
        if (typeof sync.authorization === 'string') result.sync.authorization = sync.authorization;
    }
    return result;
}

function readSaved(text: string | null): unknown {
    try {
        return text === null ? null : JSON.parse(text);
    } catch {
        return null;
    }
}

export const useSettingsStore = defineStore('settings', () => {
    const storage = createSavedStorage(SETTINGS_KEY);
    const settings = reactive<Settings>(parseSettings(readSaved(storage.read())));

    watch(settings, () => storage.write(JSON.stringify(settings)));

    return { settings };
});

import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { applyLocale, detectLocale, type LocaleCode } from '@/i18n';
import { parseSettings, type FontScale, type Settings, type WidthMode } from '@/domain/settings';
import { createBrowserJsonStorage, KEYS } from '@/storage/local';
import { isAllowedEndpoint } from '@/sync';

export const useSettingsStore = defineStore('settings', () => {
    const storage = createBrowserJsonStorage();
    const state = ref<Settings>(parseSettings(storage.read(KEYS.settings)));

    const locale = computed(() => state.value.locale);
    /** Язык ещё не выбран: показываем экран первого запуска. */
    const widthMode = computed(() => state.value.width);
    const uiScale = computed(() => state.value.uiScale);
    const noteScale = computed(() => state.value.noteScale);
    const itemScale = computed(() => state.value.itemScale);
    const headerScale = computed(() => state.value.headerScale);
    const hideFarTasks = computed(() => state.value.hideFarTasks);
    const confirmUncheck = computed(() => state.value.confirmUncheck);
    const notifyToday = computed(() => state.value.notifyToday);
    const lastNotified = computed(() => state.value.lastNotified);
    const syncEndpoint = computed(() => state.value.sync.endpoint);
    const needsLanguage = computed(() => state.value.locale === null);
    /** Язык, который реально применён: выбранный или предложенный по языку браузера. */
    const effectiveLocale = computed(() => state.value.locale ?? detectLocale(navigator.languages ?? []));

    // sync: после setLocale() `t()` сразу возвращает строки нового языка
    watch(effectiveLocale, applyLocale, { immediate: true, flush: 'sync' });

    function save(): void {
        storage.write(KEYS.settings, state.value);
    }

    function setLocale(code: LocaleCode): void {
        state.value.locale = code;
        save();
    }

    function setWidthMode(mode: WidthMode): void {
        state.value.width = mode;
        save();
    }

    function setUiScale(scale: FontScale): void {
        state.value.uiScale = scale;
        save();
    }

    function setNoteScale(scale: FontScale): void {
        state.value.noteScale = scale;
        save();
    }

    function setItemScale(scale: FontScale): void {
        state.value.itemScale = scale;
        save();
    }

    function setHeaderScale(scale: FontScale): void {
        state.value.headerScale = scale;
        save();
    }

    function setHideFarTasks(value: boolean): void {
        state.value.hideFarTasks = value;
        save();
    }

    function setConfirmUncheck(value: boolean): void {
        state.value.confirmUncheck = value;
        save();
    }

    function setNotifyToday(value: boolean): void {
        state.value.notifyToday = value;
        save();
    }

    function setLastNotified(date: string): void {
        state.value.lastNotified = date;
        save();
    }

    /** Адрес синхронизации (пока скрыт за FEATURES.sync). Небезопасный адрес не принимается. */
    function setSyncEndpoint(value: string): boolean {
        const endpoint = value.trim();
        if (!isAllowedEndpoint(endpoint)) return false;

        state.value.sync.endpoint = endpoint;
        save();
        return true;
    }

    return {
        locale,
        needsLanguage,
        effectiveLocale,
        widthMode,
        uiScale,
        noteScale,
        itemScale,
        headerScale,
        hideFarTasks,
        confirmUncheck,
        notifyToday,
        lastNotified,
        syncEndpoint,
        persistent: storage.persistent,
        setLocale,
        setWidthMode,
        setUiScale,
        setNoteScale,
        setItemScale,
        setHeaderScale,
        setHideFarTasks,
        setConfirmUncheck,
        setNotifyToday,
        setLastNotified,
        setSyncEndpoint,
    };
});

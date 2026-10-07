import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { applyLocale, detectLocale, type LocaleCode } from '@/i18n';
import { parseSettings, type Settings, type WidthMode } from '@/domain/settings';
import { createBrowserJsonStorage, KEYS } from '@/storage/local';

export const useSettingsStore = defineStore('settings', () => {
    const storage = createBrowserJsonStorage();
    const state = ref<Settings>(parseSettings(storage.read(KEYS.settings)));

    const locale = computed(() => state.value.locale);
    /** Язык ещё не выбран: показываем экран первого запуска. */
    const widthMode = computed(() => state.value.width);
    const hideFarTasks = computed(() => state.value.hideFarTasks);
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

    function setHideFarTasks(value: boolean): void {
        state.value.hideFarTasks = value;
        save();
    }

    return { locale, needsLanguage, effectiveLocale, widthMode, hideFarTasks, persistent: storage.persistent, setLocale, setWidthMode, setHideFarTasks };
});

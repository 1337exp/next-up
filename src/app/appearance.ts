import { onScopeDispose, ref, watchEffect } from 'vue';
import { useSettingsStore } from '@/app/settings';

/**
 * Тема и палитра идут атрибутами и классами на <html>: их читают и всплывающие панели, телепортированные в body.
 * Плотность — контекст TaoUI; размер интерфейса не настраивается (масштаб — у браузера и системы).
 */
export function useAppearance(): void {
    const { settings } = useSettingsStore();
    const dark = window.matchMedia('(prefers-color-scheme: dark)');
    const systemDark = ref(dark.matches);
    const onChange = (event: MediaQueryListEvent): void => void (systemDark.value = event.matches);
    dark.addEventListener('change', onChange);
    onScopeDispose(() => dark.removeEventListener('change', onChange));

    watchEffect(() => {
        const root = document.documentElement;
        const mode = settings.mode === 'auto' ? (systemDark.value ? 'dark' : 'light') : settings.mode;
        root.setAttribute('data-tao-mode', mode);
        if (settings.palette) root.setAttribute('data-tao-theme', settings.palette);
        else root.removeAttribute('data-tao-theme');
        // размер один: контекст задан явно, чтобы вся вёрстка считалась от одной шкалы
        root.classList.add('tao-size-medium', 'tao-density-auto');
    });
}

import { onScopeDispose, ref, watchEffect } from 'vue';
import { SIZES, useSettingsStore } from '@/app/settings';

/**
 * Тема, палитра и размер идут атрибутами и классами на <html>: их читают и всплывающие панели, телепортированные в body.
 * Размер и плотность — контексты TaoUI: свои множители не нужны.
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
        for (const size of SIZES) root.classList.toggle(`tao-size-${size}`, size === settings.size);
        root.classList.add('tao-density-auto');
    });
}

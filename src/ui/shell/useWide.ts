import { onScopeDispose, ref, type Ref } from 'vue';

/** Ширина окна, с которой список и редактор стоят рядом (боковая панель навигации 240 + список + редактор). */
export const WIDE_QUERY = '(min-width: 1100px)';
/** Телефон: тот же порог, что у нижней панели TaoNav (`compact` < 600px). */
export const PHONE_QUERY = '(max-width: 599px)';

export function useMedia(query: string): Ref<boolean> {
    const media = window.matchMedia(query);
    const matches = ref(media.matches);
    const onChange = (event: MediaQueryListEvent): void => void (matches.value = event.matches);
    media.addEventListener('change', onChange);
    onScopeDispose(() => media.removeEventListener('change', onChange));
    return matches;
}

export const useWide = (): Ref<boolean> => useMedia(WIDE_QUERY);
export const usePhone = (): Ref<boolean> => useMedia(PHONE_QUERY);
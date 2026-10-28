import { onScopeDispose, ref, type Ref } from 'vue';

/** Ширина окна, с которой список и редактор стоят рядом (боковая панель навигации 220 + список + редактор). */
export const WIDE_QUERY = '(min-width: 1100px)';

export function useWide(query = WIDE_QUERY): Ref<boolean> {
    const media = window.matchMedia(query);
    const wide = ref(media.matches);
    const onChange = (event: MediaQueryListEvent): void => void (wide.value = event.matches);
    media.addEventListener('change', onChange);
    onScopeDispose(() => media.removeEventListener('change', onChange));
    return wide;
}

/** Сдвиг пальца (px), с которого понятно, куда он ведёт: раньше жест считается дрожанием. */
export const SWIPE_THRESHOLD_PX = 8;

/** Доля ширины панели, которую нужно открыть (или закрыть) пальцем, чтобы жест засчитался. */
export const SWIPE_SENSE = 0.3;

export type SwipeIntent = 'pending' | 'horizontal' | 'vertical';

/** Горизонтальный жест — угол к оси X меньше ~30° (tg 30° ≈ 0,58); всё остальное — прокрутка страницы. */
export function swipeIntent(dx: number, dy: number): SwipeIntent {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < SWIPE_THRESHOLD_PX) return 'pending';
    return ax > ay * 1.7 ? 'horizontal' : 'vertical';
}

/** Смещение карточки: от 0 (закрыта) до `-width` (панель открыта целиком). */
export function clampOffset(offset: number, width: number): number {
    return Math.min(0, Math.max(-width, offset));
}

/** Куда доводим карточку, когда палец отпущен: открытая закрывается, если её потянули назад на `sense` ширины. */
export function settleOpen(offset: number, width: number, wasOpen: boolean, sense = SWIPE_SENSE): boolean {
    if (width <= 0) return false;
    const shown = -offset / width;
    return wasOpen ? shown > 1 - sense : shown > sense;
}

import { describe, expect, it } from 'vitest';
import { clampOffset, settleOpen, swipeIntent } from '@/lib/swipe';

describe('жест свайпа', () => {
    it('до порога жест не определён: дрожание пальца', () => {
        expect(swipeIntent(3, 2)).toBe('pending');
        expect(swipeIntent(-7, 0)).toBe('pending');
    });

    it('горизонтальный — если угол к оси X меньше ~30°, иначе это прокрутка', () => {
        expect(swipeIntent(-20, 4)).toBe('horizontal');
        expect(swipeIntent(20, -8)).toBe('horizontal');
        expect(swipeIntent(-20, 15)).toBe('vertical');
        expect(swipeIntent(2, 30)).toBe('vertical');
    });

    it('смещение ограничено панелью: вправо за ноль и влево дальше панели не уйти', () => {
        expect(clampOffset(40, 64)).toBe(0);
        expect(clampOffset(-30, 64)).toBe(-30);
        expect(clampOffset(-200, 64)).toBe(-64);
    });

    it('закрытая открывается после 30% ширины, открытая закрывается, если потянули назад на 30%', () => {
        expect(settleOpen(-19, 64, false)).toBe(false);
        expect(settleOpen(-20, 64, false)).toBe(true);
        expect(settleOpen(-64, 64, true)).toBe(true);
        expect(settleOpen(-46, 64, true)).toBe(true);
        expect(settleOpen(-44, 64, true)).toBe(false);
        expect(settleOpen(-10, 0, false)).toBe(false);
    });
});

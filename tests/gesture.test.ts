import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afterPointerGesture } from '@/lib/gesture';

const fire = (type: string) => document.dispatchEvent(new MouseEvent(type, { bubbles: true }));

describe('жест нажатия', () => {
    beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
    afterEach(() => vi.useRealTimers());

    it('без недавнего pointerup (Esc, программное закрытие) ждать нечего', async () => {
        await vi.advanceTimersByTimeAsync(200); // «недавно» считается по реальному времени
        fire('click'); // click позже pointerup тоже не жест
        let done = false;
        void afterPointerGesture().then(() => (done = true));
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toBe(true);
    });

    it('после pointerup ждёт click и ещё один такт', async () => {
        fire('pointerup');
        let done = false;
        void afterPointerGesture().then(() => (done = true));
        await vi.advanceTimersByTimeAsync(50);
        expect(done).toBe(false);

        fire('click');
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toBe(true);
    });

    it('если click уже прошёл (кнопка обработала нажатие), ждать нечего', async () => {
        fire('pointerup');
        fire('click');
        let done = false;
        void afterPointerGesture().then(() => (done = true));
        await vi.advanceTimersByTimeAsync(0);
        expect(done).toBe(true);
    });

    it('не дожидается click вечно', async () => {
        fire('pointerup');
        let done = false;
        void afterPointerGesture(300).then(() => (done = true));
        await vi.advanceTimersByTimeAsync(299);
        expect(done).toBe(false);
        await vi.advanceTimersByTimeAsync(5);
        expect(done).toBe(true);
    });
});

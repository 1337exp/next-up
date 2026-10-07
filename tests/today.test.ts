import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTodayClock } from '@/composables/today';
import { diffDays } from '@/domain/date';

describe('createTodayClock', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    });
    afterEach(() => vi.useRealTimers());

    it('меняет день ровно в полночь одним таймером', () => {
        vi.setSystemTime(new Date(2026, 9, 6, 23, 59, 0));
        const clock = createTodayClock();
        clock.start();
        expect(clock.today.value).toBe('2026-10-06');
        expect(vi.getTimerCount()).toBe(1);

        vi.advanceTimersByTime(30_000);
        expect(clock.today.value).toBe('2026-10-06');

        vi.advanceTimersByTime(31_000);
        expect(clock.today.value).toBe('2026-10-07');
        expect(vi.getTimerCount()).toBe(1); // следующий таймер уже назначен
        clock.stop();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('после сна компьютера догоняет при возврате на вкладку и по фокусу', () => {
        vi.setSystemTime(new Date(2026, 9, 6, 22, 0, 0));
        const clock = createTodayClock();
        clock.start();

        vi.setSystemTime(new Date(2026, 9, 9, 8, 0, 0)); // таймер не сработал: компьютер спал
        expect(clock.today.value).toBe('2026-10-06');
        document.dispatchEvent(new Event('visibilitychange'));
        expect(clock.today.value).toBe('2026-10-09');

        vi.setSystemTime(new Date(2026, 9, 10, 8, 0, 0));
        window.dispatchEvent(new Event('focus'));
        expect(clock.today.value).toBe('2026-10-10');
        clock.stop();
    });

    it('после stop() события и таймер больше не действуют', () => {
        vi.setSystemTime(new Date(2026, 9, 6, 12, 0, 0));
        const clock = createTodayClock();
        clock.start();
        clock.stop();

        vi.setSystemTime(new Date(2026, 9, 8, 12, 0, 0));
        window.dispatchEvent(new Event('focus'));
        vi.advanceTimersByTime(48 * 3600 * 1000);
        expect(clock.today.value).toBe('2026-10-06');
    });

    it.each([
        ['на летнее время', new Date(2026, 2, 28, 12, 0, 0)],
        ['на зимнее время', new Date(2026, 9, 24, 12, 0, 0)],
    ])('переход %s: дни идут подряд, ни один не пропущен и не повторён', (_name, start) => {
        const previousTz = process.env.TZ;
        process.env.TZ = 'Europe/Berlin';
        try {
            // без часового пояса с переводом часов проверка была бы пустой
            const probe = new Date(2026, 2, 29, 2, 30, 0); // этого времени в Берлине не существует
            if (probe.getHours() !== 3) return;

            vi.setSystemTime(start);
            const clock = createTodayClock();
            clock.start();

            const seen: string[] = [clock.today.value];
            for (let i = 0; i < 72; i++) {
                vi.advanceTimersByTime(3600 * 1000);
                if (clock.today.value !== seen[seen.length - 1]) seen.push(clock.today.value);
            }
            clock.stop();

            expect(seen.length).toBeGreaterThanOrEqual(3);
            for (let i = 1; i < seen.length; i++) expect(diffDays(seen[i - 1]!, seen[i]!), seen.join(' → ')).toBe(1);
        } finally {
            if (previousTz === undefined) delete process.env.TZ;
            else process.env.TZ = previousTz;
        }
    });
});

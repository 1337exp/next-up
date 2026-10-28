import { ref, type Ref } from 'vue';
import { todayIso, type IsoDate } from '@/core/date';

export interface TodayClock {
    /** Сегодняшний день (локальный календарь); меняется сам в полночь. */
    today: Readonly<Ref<IsoDate>>;
    refresh(): void;
    start(): void;
    stop(): void;
}

/**
 * Реактивное «сегодня». Один таймер до ближайшей полуночи вместо таймера раз в секунду.
 * Пересчёт также при возврате на вкладку и фокусе окна: после сна ноутбука таймер мог сработать поздно.
 */
export function createTodayClock(now: () => Date = () => new Date()): TodayClock {
    const today = ref<IsoDate>(todayIso(now()));
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;

    function schedule(): void {
        clearTimeout(timer);
        const current = now();
        const nextMidnight = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 1);
        timer = setTimeout(refresh, Math.max(1000, nextMidnight.getTime() - current.getTime()));
    }

    function refresh(): void {
        const value = todayIso(now());
        if (value !== today.value) today.value = value;
        if (running) schedule();
    }

    function onVisibility(): void {
        if (document.visibilityState === 'visible') refresh();
    }

    function start(): void {
        if (running) return;
        running = true;
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('focus', refresh);
        refresh();
    }

    function stop(): void {
        running = false;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', refresh);
    }

    return { today, refresh, start, stop };
}

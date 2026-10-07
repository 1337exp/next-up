import { addDays, addMonthsClamped, diffDays, isoParts, type IsoDate } from './date';
import type { Recurrence } from './types';

type ActiveRecurrence = Exclude<Recurrence, 'none'>;
type Step = { unit: 'day' | 'month'; count: number };

const STEPS: Record<ActiveRecurrence, Step> = {
    daily: { unit: 'day', count: 1 },
    weekly: { unit: 'day', count: 7 },
    monthly: { unit: 'month', count: 1 },
    semiannual: { unit: 'month', count: 6 },
    yearly: { unit: 'month', count: 12 },
};

/** Повтор номер n серии: anchor + n периодов. Месяцы считаются от anchor, поэтому 31-е не «съезжает» на 28-е. */
export function occurrence(anchor: IsoDate, recurrence: ActiveRecurrence, n: number): IsoDate {
    const step = STEPS[recurrence];
    return step.unit === 'day' ? addDays(anchor, n * step.count) : addMonthsClamped(anchor, n * step.count);
}

/** Ближайший повтор строго позже `after`. Для `none` — `null`. */
export function nextOccurrence(anchor: IsoDate, recurrence: Recurrence, after: IsoDate): IsoDate | null {
    if (recurrence === 'none') return null;
    if (after < anchor) return anchor;

    const step = STEPS[recurrence];
    let n: number;

    if (step.unit === 'day') {
        n = Math.floor(diffDays(anchor, after) / step.count) + 1;
    } else {
        const a = isoParts(anchor);
        const b = isoParts(after);
        const months = (b.year - a.year) * 12 + (b.month - a.month);
        n = Math.max(0, Math.floor(months / step.count) - 1);
        while (occurrence(anchor, recurrence, n) <= after) n++;
    }

    return occurrence(anchor, recurrence, n);
}

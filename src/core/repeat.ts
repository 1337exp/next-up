import { addDays, addMonthsClamped, diffDays, isoParts, type IsoDate } from './date';
import type { Repeat } from './model';

/** Id повтора детерминирован: два устройства, создавшие один и тот же повтор, создают одну и ту же запись. */
export function occurrenceId(series: string, due: IsoDate): string {
    return `${series}@${due}`;
}

type Step = { unit: 'day' | 'month'; count: number };

function stepOf(repeat: Pick<Repeat, 'every' | 'unit'>): Step {
    switch (repeat.unit) {
        case 'day': return { unit: 'day', count: repeat.every };
        case 'week': return { unit: 'day', count: repeat.every * 7 };
        case 'month': return { unit: 'month', count: repeat.every };
        case 'year': return { unit: 'month', count: repeat.every * 12 };
    }
}

/** Повтор номер n: anchor + n периодов. Месяцы считаются от anchor, поэтому 31-е не «съезжает» на 28-е. */
export function occurrence(repeat: Repeat, n: number): IsoDate {
    const step = stepOf(repeat);
    return step.unit === 'day' ? addDays(repeat.anchor, n * step.count) : addMonthsClamped(repeat.anchor, n * step.count);
}

/** Ближайший повтор строго позже `after`. */
export function nextOccurrence(repeat: Repeat, after: IsoDate): IsoDate {
    if (after < repeat.anchor) return repeat.anchor;

    const step = stepOf(repeat);
    let n: number;

    if (step.unit === 'day') {
        n = Math.floor(diffDays(repeat.anchor, after) / step.count) + 1;
    } else {
        const a = isoParts(repeat.anchor);
        const b = isoParts(after);
        const months = (b.year - a.year) * 12 + (b.month - a.month);
        n = Math.max(0, Math.floor(months / step.count) - 1);
        while (occurrence(repeat, n) <= after) n++;
    }

    return occurrence(repeat, n);
}

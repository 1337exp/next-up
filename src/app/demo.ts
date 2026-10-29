import { addDays, addMonthsClamped, type IsoDate } from '@/core/date';
import type { Item, Note, Repeat } from '@/core/model';
import { occurrenceId } from '@/core/repeat';

/** Демо-данные для ручной проверки (только для разработки): все состояния карточки, разделители, серия в архиве. */
export function buildDemoNotes(today: IsoDate, now: number): Note[] {
    let n = 0;
    const item = (text: string, done = false): Item => ({ id: `demo-i${++n}`, text, doneAt: done ? now - 3_600_000 : null });
    const base = (due: IsoDate, body: string, extra: Partial<Note> = {}): Note => ({
        id: `demo-${++n}`, due, body, items: [], repeat: null, doneAt: null, createdAt: now, updatedAt: now, deletedAt: null, ...extra,
    });
    const series = (id: string, anchor: IsoDate, unit: Repeat['unit'], every = 1): Repeat => ({ series: id, anchor, unit, every });

    const daily = series('demo-s-vitamins', addDays(today, -9), 'day');
    const weekly = series('demo-s-weekly', addDays(today, -3), 'week');

    return [
        base(today, '**Сегодня:** позвонить в банк #работа\n\nСсылка: [пример](https://example.com)', { items: [item('Паспорт', true), item('Номер договора')] }),
        base(addDays(today, 1), 'Завтра: короткая заметка #дом'),
        base(addDays(today, 12), 'Через 12 дней #работа'),
        base(addDays(today, 30), 'Далёкая заметка\n\n- пункт один\n- пункт два', { items: [item('Подготовить документы')] }),
        base(addMonthsClamped(today, 14), 'В следующем году: проверка разделителя года', { repeat: series('demo-s-year', addMonthsClamped(today, 14), 'year') }),
        base(addDays(today, -1), 'Вчера (архив) #дом'),
        base(addDays(today, 3), 'Завершена до срока (архив)', { doneAt: now - 60_000 }),
        base(addDays(today, 2), '<b>Сырой HTML</b> <script>alert(1)</script> показывается как текст'),
        // серии: недостающие повторы создаст normalize, подряд идущие в архиве свернутся в одну строку
        { ...base(daily.anchor, 'Принять витамины', { repeat: daily }), id: occurrenceId(daily.series, daily.anchor) },
        { ...base(weekly.anchor, 'Купить продукты на неделю #дом', { repeat: weekly }), id: occurrenceId(weekly.series, weekly.anchor) },
    ];
}

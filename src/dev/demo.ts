import { addDays, addMonthsClamped, type IsoDate } from '@/domain/date';
import { newId } from '@/domain/id';
import type { Task } from '@/domain/types';

/** Тестовые данные для ручной проверки списка (только для разработки): все состояния карточки и разделители. */
export function buildDemoTasks(today: IsoDate, now: number, makeId: () => string = newId): Task[] {
    const base = (date: IsoDate, note: string, extra: Partial<Task> = {}): Task => ({
        id: makeId(), date, note, checklist: [], recurrence: 'none', anchor: date, done: false, rolled: false, updatedAt: now, ...extra,
    });
    const item = (text: string, done = false) => ({ text, done, changedAt: done ? new Date(now).toISOString() : null });

    return [
        base(today, '**Сегодня:** позвонить в банк\n\nСсылка: [пример](https://example.com)', { checklist: [item('Паспорт', true), item('Номер договора')] }),
        base(addDays(today, 1), 'Завтра: короткая заметка'),
        base(addDays(today, 5), 'Скоро (красный бейдж), раз в неделю', { recurrence: 'weekly' }),
        base(addDays(today, 12), 'Через 12 дней'),
        base(addDays(today, 30), 'Далёкая задача (сворачивается в настройках)\n\n- пункт один\n- пункт два', { checklist: [item('Подготовить документы')] }),
        base(addMonthsClamped(today, 14), 'В следующем году: проверка разделителя года', { recurrence: 'yearly' }),
        base(addDays(today, -1), 'Вчера (архив)'),
        base(addDays(today, -40), 'Давно (архив), раз в месяц', { recurrence: 'monthly' }),
        base(addDays(today, 3), 'Завершена до срока (архив)', { done: true, rolled: true }),
        base(addDays(today, 2), '<b>Сырой HTML</b> <script>alert(1)</script> показывается как текст'),
    ];
}

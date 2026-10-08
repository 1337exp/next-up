import { describe, expect, it } from 'vitest';
import { decideTodayNotice, todayDigest } from '@/domain/digest';
import { makeTask } from './helpers';

const TODAY = '2026-10-08';

describe('оповещение «задачи на сегодня»', () => {
    describe('состав', () => {
        it('только невыполненные задачи со сроком сегодня, в порядке списка', () => {
            const digest = todayDigest(
                [
                    makeTask({ date: '2026-10-08', note: 'Позвонить в банк' }),
                    makeTask({ date: '2026-10-09', note: 'Завтра' }),
                    makeTask({ date: '2026-10-08', note: 'Уже сделана', done: true }),
                    makeTask({ date: '2026-10-07', note: 'Вчера' }),
                    makeTask({ date: '2026-10-08', note: 'Купить хлеб' }),
                ],
                TODAY,
            );
            expect(digest).toEqual({ date: TODAY, count: 2, lines: ['Позвонить в банк', 'Купить хлеб'] });
        });

        it('строка — начало заметки в одну строку, как в списке; без заметки берётся первый пункт', () => {
            const long = 'а'.repeat(80);
            const digest = todayDigest(
                [
                    makeTask({ date: TODAY, note: 'Первая\n\nвторая   строка' }),
                    makeTask({ date: TODAY, note: long }),
                    makeTask({ date: TODAY, note: '', checklist: [{ text: 'пункт', done: false, changedAt: null }] }),
                ],
                TODAY,
            );
            expect(digest.lines).toEqual(['Первая вторая строка', `${'а'.repeat(50)} ...`, 'пункт']);
        });

        it('если на сегодня ничего нет, считается нулём', () => {
            expect(todayDigest([makeTask({ date: '2026-10-20' })], TODAY).count).toBe(0);
            expect(todayDigest([], TODAY)).toEqual({ date: TODAY, count: 0, lines: [] });
        });
    });

    describe('когда показывать', () => {
        const base = { enabled: true, granted: true, lastNotified: '', today: TODAY, hidden: true };

        it('включено, есть разрешение, вкладка скрыта, сегодня ещё не показывали — показать и запомнить день', () => {
            expect(decideTodayNotice(base)).toEqual({ mark: true, show: true });
        });

        it('выключено — ничего, и день не запоминается', () => {
            expect(decideTodayNotice({ ...base, enabled: false })).toEqual({ mark: false, show: false });
        });

        it('за этот день уже обработано — повторов нет', () => {
            expect(decideTodayNotice({ ...base, lastNotified: TODAY })).toEqual({ mark: false, show: false });
            expect(decideTodayNotice({ ...base, lastNotified: '2026-10-07' })).toEqual({ mark: true, show: true });
        });

        it('вкладка открыта: задачи и так перед глазами, не показываем, но день запоминаем (позже в тот же день не нужно)', () => {
            expect(decideTodayNotice({ ...base, hidden: false })).toEqual({ mark: true, show: false });
        });

        it('нет разрешения: не показываем', () => {
            expect(decideTodayNotice({ ...base, granted: false })).toEqual({ mark: true, show: false });
        });
    });
});

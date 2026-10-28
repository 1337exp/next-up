import { describe, expect, it } from 'vitest';
import { decideTodayNotice, todayDigest } from '@/core/digest';
import { removeNote } from '@/core/notes';
import { note } from './helpers';

const TODAY = '2026-10-10';

describe('состав оповещения', () => {
    it('живые незавершённые со сроком сегодня, текст в одну строку, чужие даты и удалённые не входят', () => {
        const digest = todayDigest(
            [
                note({ id: 'a', due: TODAY, body: 'Позвонить\nв банк' }),
                note({ id: 'b', due: TODAY, body: 'готово', doneAt: 5 }),
                note({ id: 'c', due: '2026-10-11', body: 'завтра' }),
                note({ id: 'd', due: '2026-10-09', body: 'вчера' }),
                removeNote(note({ id: 'e', due: TODAY, body: 'удалена' }), 1),
                note({ id: 'f', due: TODAY, body: '', items: [{ id: 'i', text: 'пункт', doneAt: null }] }),
            ],
            TODAY,
        );
        expect(digest).toEqual({ date: TODAY, count: 2, lines: ['Позвонить в банк', 'пункт'] });
    });

    it('пусто — нулевой состав', () => {
        expect(todayDigest([], TODAY)).toEqual({ date: TODAY, count: 0, lines: [] });
    });
});

describe('когда показывать', () => {
    const base = { enabled: true, granted: true, lastNotified: '', today: TODAY, hidden: true };

    it('раз в день, при скрытой вкладке и разрешении', () => {
        expect(decideTodayNotice(base)).toEqual({ mark: true, show: true });
    });

    it('выключено или уже было сегодня: ничего не делаем и дату не трогаем', () => {
        expect(decideTodayNotice({ ...base, enabled: false })).toEqual({ mark: false, show: false });
        expect(decideTodayNotice({ ...base, lastNotified: TODAY })).toEqual({ mark: false, show: false });
    });

    it('вкладка открыта или нет разрешения: не показываем, но день отмечаем — позже оповещение уже не нужно', () => {
        expect(decideTodayNotice({ ...base, hidden: false })).toEqual({ mark: true, show: false });
        expect(decideTodayNotice({ ...base, granted: false })).toEqual({ mark: true, show: false });
    });

    it('новый день снова разрешает', () => {
        expect(decideTodayNotice({ ...base, lastNotified: '2026-10-09' })).toEqual({ mark: true, show: true });
    });
});

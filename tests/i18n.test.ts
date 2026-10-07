import { describe, expect, it } from 'vitest';
import { translate, type MessageKey } from '@/i18n';
import { LOCALES } from '@/i18n/locales';
import { detectLocale } from '@/i18n/detect';
import { monthName } from '@/i18n/format';

function flatten(dict: unknown, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(dict as Record<string, unknown>)) {
        const path = prefix + key;
        if (typeof value === 'string') out[path] = value;
        else Object.assign(out, flatten(value, `${path}.`));
    }
    return out;
}

const placeholders = (text: string) => (text.match(/\{\d+\}/g) ?? []).sort().join(',');

describe('словари', () => {
    const ru = flatten(LOCALES.ru);
    const en = flatten(LOCALES.en);

    it('в ru и en один и тот же набор ключей', () => {
        expect(Object.keys(en).sort()).toEqual(Object.keys(ru).sort());
    });

    it('в обоих языках одинаковые подстановки {0}, {1}', () => {
        for (const key of Object.keys(ru)) {
            expect(placeholders(en[key] ?? ''), key).toBe(placeholders(ru[key] ?? ''));
        }
    });

    it('нет пустых строк, кроме намеренных', () => {
        for (const [key, value] of Object.entries({ ...ru, ...en })) expect(value.length, key).toBeGreaterThan(0);
    });
});

describe('translate', () => {
    it('возвращает строку нужного языка', () => {
        expect(translate('ru', 'tasks.date.today')).toBe('Сегодня');
        expect(translate('en', 'tasks.date.today')).toBe('Today');
    });

    it('подставляет аргументы по номеру', () => {
        expect(translate('ru', 'tasks.date.daysLeft', [3])).toBe('Дней: 3');
        expect(translate('en', 'tasks.notify.remove.message', ['Test'])).toBe('Are you sure you want to delete entry: "Test"?');
    });

    it('оставляет {n} на месте, если аргумента нет', () => {
        expect(translate('en', 'tasks.date.daysLeft')).toBe('Days: {0}');
    });

    it('при неизвестном ключе возвращает сам ключ', () => {
        expect(translate('ru', 'no.such.key' as MessageKey)).toBe('no.such.key');
    });

    it('опечатка в ключе не компилируется', () => {
        // @ts-expect-error несуществующий ключ ловится на этапе сборки
        translate('ru', 'tasks.date.todayy');
    });
});

describe('detectLocale', () => {
    it('берёт первый поддерживаемый язык', () => {
        expect(detectLocale(['ru-RU', 'en'])).toBe('ru');
        expect(detectLocale(['de-DE', 'ru'])).toBe('ru');
        expect(detectLocale(['en_US'])).toBe('en');
    });

    it('иначе английский', () => {
        expect(detectLocale(['de', 'fr'])).toBe('en');
        expect(detectLocale([])).toBe('en');
    });
});

describe('monthName', () => {
    it('даёт названия месяцев в именительном падеже с заглавной буквы', () => {
        expect(monthName('ru', 1)).toBe('Январь');
        expect(monthName('ru', 12)).toBe('Декабрь');
        expect(monthName('en', 3)).toBe('March');
    });
});

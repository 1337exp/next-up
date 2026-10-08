import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defaultSettings, parseSettings } from '@/domain/settings';
import { createJsonStorage, KEYS } from '@/storage/local';
import { useSettingsStore } from '@/stores/settings';
import { translate } from '@/i18n';

describe('parseSettings', () => {
    it('мусор превращается в настройки по умолчанию', () => {
        for (const bad of [null, undefined, 42, 'text', [], true]) expect(parseSettings(bad)).toEqual(defaultSettings());
    });

    it('повреждённое поле заменяется, остальные сохраняются', () => {
        const s = parseSettings({ locale: 'xx', hideFarTasks: true, sync: { endpoint: 5 } });
        expect(s.locale).toBeNull();
        expect(s.hideFarTasks).toBe(true);
        expect(s.sync.endpoint).toBe('');
    });

    it('принимает корректные значения', () => {
        const s = parseSettings({ locale: 'ru', hideFarTasks: false, sync: { endpoint: 'https://example.org/sync' } });
        expect(s.locale).toBe('ru');
        expect(s.sync.endpoint).toBe('https://example.org/sync');
    });
});

describe('JsonStorage', () => {
    it('повреждённый JSON читается как null, запись не бросает исключений', () => {
        const raw = new Map<string, string>([['a', '{oops']]);
        const storage = createJsonStorage({
            getItem: (k) => raw.get(k) ?? null,
            setItem: () => {
                throw new Error('quota');
            },
            removeItem: () => undefined,
        });
        expect(storage.read('a')).toBeNull();
        expect(storage.write('a', { x: 1 })).toBe(false);
    });
});

describe('settings store', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
        Object.defineProperty(navigator, 'languages', { value: ['en-US'], configurable: true });
    });

    it('первый запуск: язык не выбран, интерфейс на языке браузера', () => {
        Object.defineProperty(navigator, 'languages', { value: ['ru-RU'], configurable: true });
        setActivePinia(createPinia());
        const s = useSettingsStore();
        expect(s.needsLanguage).toBe(true);
        expect(s.effectiveLocale).toBe('ru');
        expect(document.documentElement.lang).toBe('ru');
        expect(localStorage.getItem(KEYS.settings)).toBeNull(); // предложение не сохраняется само
    });

    it('выбор языка сохраняется под ключом nextup-settings и переживает перезапуск', () => {
        const s = useSettingsStore();
        s.setLocale('ru');
        expect(s.needsLanguage).toBe(false);
        expect(document.documentElement.lang).toBe('ru');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').locale).toBe('ru');

        setActivePinia(createPinia()); // «перезагрузка»
        const again = useSettingsStore();
        expect(again.needsLanguage).toBe(false);
        expect(again.locale).toBe('ru');
    });

    it('повреждённые данные в хранилище дают экран выбора языка, а не падение', () => {
        localStorage.setItem(KEYS.settings, '{"locale": "klingon"');
        setActivePinia(createPinia());
        expect(useSettingsStore().needsLanguage).toBe(true);
    });

    it('если localStorage недоступен, работает в памяти и не падает', () => {
        // как в iframe с sandbox: само обращение к window.localStorage бросает SecurityError
        const original = Object.getOwnPropertyDescriptor(window, 'localStorage');
        Object.defineProperty(window, 'localStorage', {
            configurable: true,
            get() {
                throw new DOMException('denied', 'SecurityError');
            },
        });
        try {
            setActivePinia(createPinia());
            const s = useSettingsStore();
            expect(s.persistent).toBe(false);
            expect(() => s.setLocale('en')).not.toThrow();
            expect(s.locale).toBe('en');
            expect(s.needsLanguage).toBe(false);
        } finally {
            if (original) Object.defineProperty(window, 'localStorage', original);
        }
    });

    it('после смены языка t() сразу отдаёт строки нового языка', () => {
        const s = useSettingsStore();
        s.setLocale('en');
        expect(translate(s.effectiveLocale, 'settings.title')).toBe('Settings');
        s.setLocale('ru');
        expect(translate(s.effectiveLocale, 'settings.title')).toBe('Настройки');
    });
});

describe('размер шрифта', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    it('по умолчанию 100%; неизвестные значения заменяются, остальные поля не страдают', () => {
        expect(defaultSettings().noteScale).toBe(100);
        expect(defaultSettings().headerScale).toBe(100);
        expect(defaultSettings().itemScale).toBe(100);
        expect(defaultSettings().uiScale).toBe(100);
        expect(parseSettings({ uiScale: 140 }).uiScale).toBe(140);
        expect(parseSettings({ uiScale: 150 }).uiScale).toBe(100);
        const parsed = parseSettings({ noteScale: 130, headerScale: '120', width: 'auto' });
        expect([parsed.noteScale, parsed.headerScale, parsed.width]).toEqual([100, 100, 'auto']);
        expect(parseSettings({ noteScale: 140, headerScale: 90 })).toMatchObject({ noteScale: 140, headerScale: 90 });
    });

    it('размеры независимы, сохраняются и переживают перезапуск', () => {
        const s = useSettingsStore();
        s.setNoteScale(120);
        s.setItemScale(140);
        s.setHeaderScale(90);
        const saved = JSON.parse(localStorage.getItem('nextup-settings') ?? '{}');
        expect([saved.noteScale, saved.itemScale, saved.headerScale]).toEqual([120, 140, 90]);

        setActivePinia(createPinia());
        const again = useSettingsStore();
        expect([again.noteScale, again.itemScale, again.headerScale]).toEqual([120, 140, 90]);
    });
});

describe('ширина интерфейса', () => {
    beforeEach(() => {
        localStorage.clear();
        setActivePinia(createPinia());
    });

    it('по умолчанию «Мини»; неизвестное значение заменяется на «Мини»', () => {
        expect(defaultSettings().width).toBe('mini');
        expect(parseSettings({ width: 'huge' }).width).toBe('mini');
        expect(parseSettings({ width: 'auto' }).width).toBe('auto');
        expect(defaultSettings().confirmUncheck).toBe(true);
    });

    it('выбор сохраняется и переживает перезапуск', () => {
        const s = useSettingsStore();
        s.setWidthMode('mini');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').width).toBe('mini');

        setActivePinia(createPinia());
        expect(useSettingsStore().widthMode).toBe('mini');
    });
});

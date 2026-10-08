import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI, { TaoDropdownMenu, TaoScrollTop, TaoTabs } from '@1337exp/taoui';
import App from '@/App.vue';
import TaskCard from '@/components/TaskCard.vue';
import { KEYS } from '@/storage/local';
import { applyLocale } from '@/i18n';
import type { Task } from '@/domain/types';
import { makeTask } from './helpers';

// confirm() и toast() подменяем: настоящие монтируют свои хосты в body
const mocks = vi.hoisted(() => ({ answer: true, asked: [] as string[], toasts: [] as string[] }));

vi.mock('@1337exp/taoui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@1337exp/taoui')>();

    const confirm = (title: string) => {
        mocks.asked.push(title);
        const builder: Record<string, unknown> = {
            then: (resolve: (value: boolean) => void) => resolve(mocks.answer),
        };
        for (const name of ['message', 'ok', 'cancel', 'danger']) {
            builder[name] = (value?: unknown) => {
                if (name === 'message') mocks.asked.push(String(value));
                return builder;
            };
        }
        return builder;
    };

    const toast = Object.assign(vi.fn(), {
        warning: (message: string) => void mocks.toasts.push(`warning: ${message}`),
        error: (message: string) => void mocks.toasts.push(`error: ${message}`),
        success: (message: string) => void mocks.toasts.push(`success: ${message}`),
    });

    return { ...original, confirm, toast };
});

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function mountApp(tasks: Task[] = [], locale: 'ru' | 'en' = 'ru', settings: Record<string, unknown> = {}) {
    localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale, ...settings }));
    if (tasks.length) localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks }));
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(App, { global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
}

const stored = () => (JSON.parse(localStorage.getItem(KEYS.tasks) ?? 'null') as { tasks: Task[] } | null)?.tasks ?? [];
const tabButton = (w: ReturnType<typeof mountApp>, text: string) => w.findAll('[role="tab"], button').find((b) => b.text().startsWith(text))!;
const tabLabels = (w: ReturnType<typeof mountApp>) => w.findAll('[role="tab"]').map((t) => t.text());

describe('экран списка', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        mocks.answer = true;
        mocks.asked.length = 0;
        mocks.toasts.length = 0;
        applyLocale('ru');
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(NOW);
    });

    it('пустой список: подпись и счётчики вкладок', () => {
        const w = mountApp();
        expect(w.text()).toContain('Нет записей');
        expect(w.text()).toContain('Активные 0');
        expect(w.text()).toContain('Архив 0');
        w.unmount();
    });

    it('панель управления: настройки слева, затем вкладки, затем «Добавить»', () => {
        const w = mountApp();
        const row = w.find('.toolbar-row').element;
        const kinds = [...row.children].map((el) => (el.getAttribute('aria-label') ?? (el.classList.contains('tabs') ? 'tabs' : el.className)));
        expect(kinds).toEqual(['Настройки', 'tabs', 'Создать']);
        w.unmount();
    });

    it('вкладки показывают количество, переключение меняет список', async () => {
        const w = mountApp([
            makeTask({ id: 'a', date: '2026-10-10', note: 'активная-1' }),
            makeTask({ id: 'b', date: '2026-10-20', note: 'активная-2' }),
            makeTask({ id: 'c', date: '2026-10-01', note: 'архивная-1', rolled: true }),
        ]);
        expect(w.text()).toContain('Активные 2');
        expect(w.text()).toContain('Архив 1');
        expect(w.text()).toContain('активная-1');
        expect(w.text()).not.toContain('архивная-1');

        await tabButton(w, 'Архив').trigger('click');
        expect(w.text()).toContain('архивная-1');
        expect(w.text()).not.toContain('активная-1');
        w.unmount();
    });

    it('порядок: активные — ближайшие сверху, архив — свежие сверху', async () => {
        const w = mountApp([
            makeTask({ id: 'a', date: '2026-10-20', note: 'поздно', rolled: true }),
            makeTask({ id: 'b', date: '2026-10-08', note: 'рано', rolled: true }),
            makeTask({ id: 'c', date: '2026-09-02', note: 'старый', rolled: true }),
            makeTask({ id: 'd', date: '2026-10-02', note: 'свежий', rolled: true }),
        ]);
        const order = () => w.findAllComponents(TaskCard).map((c) => c.props('task').note);
        expect(order()).toEqual(['рано', 'поздно']);

        await tabButton(w, 'Архив').trigger('click');
        expect(order()).toEqual(['свежий', 'старый']);
        w.unmount();
    });

    it('разделители месяцев: квартал и месяц, год — только если он не текущий', () => {
        const w = mountApp([
            makeTask({ id: 'a', date: '2026-10-10' }),
            makeTask({ id: 'b', date: '2026-10-25' }),
            makeTask({ id: 'c', date: '2026-12-05' }),
            makeTask({ id: 'd', date: '2027-01-15' }),
        ]);
        const dividers = w.findAll('.group').map((g) => g.find('.group > :first-child').text());
        expect(dividers).toEqual(['К4 / Октябрь', 'К4 / Декабрь', 'К1 / Январь 2027']);
        expect(w.findAll('.group')[0]!.findAllComponents(TaskCard)).toHaveLength(2);
        expect(w.findAll('.tao-divider').every((d) => d.classes().includes('tao-divider--dashed'))).toBe(true); // разделители пунктирные
        expect(w.findAll('.tao-divider')).toHaveLength(3);
        w.unmount();
    });

    it('разделители на английском', () => {
        const w = mountApp([makeTask({ id: 'a', date: '2026-10-10' })], 'en');
        expect(w.find('.group').text()).toContain('Q4 / October');
        expect(w.text()).toContain('Active 1');
        w.unmount();
    });

    describe('действия над задачей', () => {
        const menuOf = (w: ReturnType<typeof mountApp>) => w.findComponent(TaskCard).findComponent(TaoDropdownMenu);

        it('«Завершено»: уходит в архив, сохраняется', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', note: 'дело' })]);
            menuOf(w).vm.$emit('selected', 'done');
            await nextTick();

            expect(w.text()).toContain('Активные 0');
            expect(w.text()).toContain('Архив 1');
            expect(stored()[0]).toMatchObject({ id: 'a', done: true });
            w.unmount();
        });

        it('отметка пункта чек-листа сохраняется', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', checklist: [{ text: 'шаг', done: false, changedAt: null }] })]);
            await w.find('.list input[type="checkbox"]').setValue(true);

            expect(stored()[0]!.checklist[0]!.done).toBe(true);
            w.unmount();
        });

        it('удаление спрашивает подтверждение с названием задачи; «нет» ничего не удаляет, «да» удаляет', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', note: 'Купить хлеб' })]);

            mocks.answer = false;
            menuOf(w).vm.$emit('selected', 'remove');
            await vi.waitFor(() => expect(mocks.asked.length).toBe(2));
            expect(mocks.asked).toEqual(['Подтвердите действие', 'Вы действительно хотите удалить запись: "Купить хлеб"?']);
            expect(w.text()).toContain('Активные 1');
            expect(stored()).toHaveLength(1);

            mocks.answer = true;
            menuOf(w).vm.$emit('selected', 'remove');
            await vi.waitFor(() => expect(w.text()).toContain('Активные 0'));
            expect(stored()).toHaveLength(0);
            w.unmount();
        });
    });

    describe('форма из списка', () => {
        const modalTitle = () => document.body.querySelector('.tao-modal__title')?.textContent;
        const field = <T extends Element>(selector: string) => document.body.querySelector<T>(selector)!;
        const fill = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
            el.value = value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            await nextTick();
        };

        it('кнопка «+» открывает пустую форму', async () => {
            const w = mountApp();
            expect(document.body.querySelector('.tao-modal')).toBeNull();

            await w.find('button[aria-label="Создать"]').trigger('click');
            await nextTick();
            expect(modalTitle()).toBe('Новая заметка');
            expect(field<HTMLInputElement>('input[placeholder="dd.mm.yyyy"]').value).toBe('06.10.2026');
            w.unmount();
        });

        it('созданная задача появляется в списке, а с прошедшей датой — сразу на вкладке «Архив»', async () => {
            const w = mountApp();

            const create = async (date: string, note: string) => {
                await w.find('button[aria-label="Создать"]').trigger('click');
                await nextTick();
                await fill(field<HTMLInputElement>('input[placeholder="dd.mm.yyyy"]'), date);
                await fill(field<HTMLTextAreaElement>('.tao-modal textarea'), note);
                field<HTMLButtonElement>('.tao-modal__footer .submit').click();
                await nextTick();
            };

            await create('20.10.2026', 'будущая');
            expect(w.text()).toContain('Активные 1');
            expect(w.text()).toContain('будущая');

            await create('01.10.2026', 'прошлая');
            expect(w.text()).toContain('Архив 1');
            expect(w.text()).toContain('прошлая'); // переключились на вкладку, где она лежит
            expect(w.text()).not.toContain('будущая');
            expect(stored().map((t) => t.note).sort()).toEqual(['будущая', 'прошлая']);
            w.unmount();
        });

        it('«Изменить» и «Клонировать» из меню карточки открывают форму с данными задачи', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-20', note: 'образец' })]);
            const menu = () => w.findComponent(TaskCard).findComponent(TaoDropdownMenu);

            menu().vm.$emit('selected', 'edit');
            await nextTick();
            expect(modalTitle()).toBe('Изменить');
            expect(field<HTMLTextAreaElement>('.tao-modal textarea').value).toBe('образец');

            field<HTMLButtonElement>('.tao-modal__footer button').click(); // «Отменить»
            await nextTick();

            menu().vm.$emit('selected', 'clone');
            await nextTick();
            expect(modalTitle()).toBe('Клонировать заметку');
            expect(field<HTMLTextAreaElement>('.tao-modal textarea').value).toBe('образец');
            w.unmount();
        });
    });

    it('сворачивание далёких задач включается в настройках и сразу действует на список', async () => {
        const w = mountApp([makeTask({ id: 'a', date: '2026-12-01', note: 'далёкая заметка' })]);
        expect(w.text()).toContain('далёкая заметка');

        await w.find('button[aria-label="Настройки"]').trigger('click');
        await nextTick();
        const toggle = document.body.querySelector<HTMLElement>('[role="switch"]');
        expect(toggle).toBeTruthy();
        toggle!.click();
        await nextTick();

        expect(w.findComponent(TaskCard).text()).not.toContain('далёкая заметка');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').hideFarTasks).toBe(true);
        w.unmount();
    });

    it('язык переключается на лету и в списке', async () => {
        const w = mountApp([makeTask({ id: 'a', date: '2026-10-06' })]);
        expect(w.text()).toContain('Сегодня');

        applyLocale('en');
        await nextTick();
        expect(w.text()).toContain('Today');
        expect(w.text()).toContain('Active 1');
        w.unmount();
    });

    describe('сообщения о хранилище', () => {
        it('повреждённые данные', () => {
            localStorage.setItem(KEYS.tasks, '{"oops');
            const w = mountApp();
            expect(mocks.toasts).toEqual(['warning: Сохранённые задачи не удалось прочитать. Копия данных сохранена, список начат заново.']);
            w.unmount();
        });

        it('пропущенные записи', () => {
            localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks: [makeTask({ date: '2026-10-10' }), { id: 'broken' }] }));
            const w = mountApp();
            expect(mocks.toasts).toEqual(['warning: Пропущено повреждённых записей: 1.']);
            w.unmount();
        });

        it('в обычном случае сообщений нет', () => {
            const w = mountApp([makeTask({ date: '2026-10-10' })]);
            expect(mocks.toasts).toEqual([]);
            w.unmount();
        });
    });
});

describe('панель: вкладки-бейджи, поиск, «Наверх», подтверждение снятия отметки', () => {
    const typeInSearch = async (w: ReturnType<typeof mountApp>, value: string) => {
        const input = w.find('.search input');
        (input.element as HTMLInputElement).value = value;
        await input.trigger('input');
        await nextTick();
    };

    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        mocks.answer = true;
        mocks.asked.length = 0;
        mocks.toasts.length = 0;
        applyLocale('ru');
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(NOW);
    });

    const sample = () => [
        makeTask({ id: 'a', date: '2026-10-10', note: 'Купить хлеб' }),
        makeTask({ id: 'b', date: '2026-11-20', note: 'Позвонить маме', checklist: [{ text: 'хлеб не забыть', done: false, changedAt: null }] }),
        makeTask({ id: 'c', date: '2026-10-01', note: 'Старый хлеб', rolled: true }),
        makeTask({ id: 'd', date: '2026-09-01', note: 'Другое', rolled: true }),
    ];

    describe('вкладки', () => {
        it('счётчик — отдельный бейдж-«надстрочник», а не текст в скобках', () => {
            const w = mountApp(sample());
            const badges = w.findAll('[role="tab"] .tab-count').map((b) => b.text());
            expect(badges).toEqual(['2', '2']);
            expect(tabLabels(w)).toEqual(['Активные 2', 'Архив 2']);
            expect(w.text()).not.toMatch(/\(\d+\)/);
            w.unmount();
        });

        it('большие числа не ломают разметку', () => {
            const many = Array.from({ length: 100 }, (_, i) => makeTask({ id: `m${i}`, date: '2026-12-01', note: `n${i}` }));
            const w = mountApp(many);
            expect(w.findAll('[role="tab"] .tab-count')[0]!.text()).toBe('100');
            w.unmount();
        });

        it('вкладки выровнены по центру', () => {
            const w = mountApp();
            expect(w.findComponent(TaoTabs).props('justify')).toBe('center');
            w.unmount();
        });
    });

    describe('быстрый поиск', () => {
        it('строка поиска стоит под вкладками внутри карточки панели', () => {
            const w = mountApp();
            const toolbar = w.find('.toolbar');
            const children = [...toolbar.find('.tao-card__body').element.children].map((el) => el.className.split(' ')[0]);
            expect(children[0]).toBe('toolbar-row');
            expect(toolbar.find('.search').exists()).toBe(true);
            expect(toolbar.find('.search input').attributes('placeholder')).toBe('Поиск');
            w.unmount();
        });

        it('фильтрует список и счётчики вкладок: по заметке и по пунктам списка', async () => {
            const w = mountApp(sample());
            await typeInSearch(w, 'хлеб');

            expect(tabLabels(w)).toEqual(['Активные 2', 'Архив 1']);
            expect(w.findAllComponents(TaskCard).map((c) => c.props('task').id)).toEqual(['a', 'b']);

            await tabButton(w, 'Архив').trigger('click');
            expect(w.findAllComponents(TaskCard).map((c) => c.props('task').id)).toEqual(['c']);
            w.unmount();
        });

        it('нет совпадений: «Ничего не найдено» вместо «Нет записей», у вкладки без совпадений счётчика нет', async () => {
            const w = mountApp(sample());
            await typeInSearch(w, 'Старый');

            expect(tabLabels(w)).toEqual(['Активные', 'Архив 1']); // «0» не показываем: ясно, что здесь пусто
            expect(w.text()).toContain('Ничего не найдено');
            expect(w.text()).not.toContain('Нет записей');
            w.unmount();
        });

        it('разделители месяцев строятся по найденному', async () => {
            const w = mountApp(sample());
            expect(w.findAll('.group')).toHaveLength(2); // октябрь и ноябрь
            await typeInSearch(w, 'маме');
            expect(w.findAll('.group')).toHaveLength(1);
            expect(w.find('.group').text()).toContain('Ноябрь');
            w.unmount();
        });

        it('клик по хештегу в заметке ищет по нему, повторный клик снимает поиск', async () => {
            const tasksWithTag = [
                makeTask({ id: 'a', date: '2026-10-20', note: 'Позвонить #работа' }),
                makeTask({ id: 'b', date: '2026-10-21', note: 'Купить хлеб' }),
            ];
            const w = mountApp(tasksWithTag);
            const input = () => w.find('.search input').element as HTMLInputElement;
            expect(w.findAllComponents(TaskCard)).toHaveLength(2);

            await w.find('.hashtag').trigger('click');
            expect(input().value).toBe('#работа');
            expect(w.findAllComponents(TaskCard)).toHaveLength(1);

            await w.find('.hashtag').trigger('click');
            expect(input().value).toBe('');
            expect(w.findAllComponents(TaskCard)).toHaveLength(2);
            w.unmount();
        });

        it('кнопка очистки появляется только при вводе и возвращает весь список', async () => {
            const w = mountApp(sample());
            expect(w.find('.search-clear').exists()).toBe(false);

            await typeInSearch(w, 'маме');
            expect(w.findAllComponents(TaskCard)).toHaveLength(1);
            await w.find('.search-clear').trigger('click');
            expect(w.findAllComponents(TaskCard)).toHaveLength(2);
            expect((w.find('.search input').element as HTMLInputElement).value).toBe('');
            expect(w.find('.search-clear').exists()).toBe(false);
            w.unmount();
        });

        it('Esc очищает поиск', async () => {
            const w = mountApp(sample());
            await typeInSearch(w, 'маме');
            await w.find('.search input').trigger('keydown', { key: 'Escape' });
            expect(w.findAllComponents(TaskCard)).toHaveLength(2);
            w.unmount();
        });

        it('результаты следуют за изменениями данных: завершённая задача уходит на другую вкладку и в счётчик', async () => {
            const w = mountApp(sample());
            await typeInSearch(w, 'хлеб');
            w.findAllComponents(TaskCard)[0]!.findComponent(TaoDropdownMenu).vm.$emit('selected', 'done'); // «Купить хлеб»
            await nextTick();
            expect(tabLabels(w)).toEqual(['Активные 1', 'Архив 2']);
            w.unmount();
        });

        it('поиск не стирается при смене вкладки', async () => {
            const w = mountApp(sample());
            await typeInSearch(w, 'хлеб');
            await tabButton(w, 'Архив').trigger('click');
            expect((w.find('.search input').element as HTMLInputElement).value).toBe('хлеб');
            w.unmount();
        });
    });

    it('кнопка «Наверх» подключена и подписана на языке интерфейса', () => {
        const w = mountApp();
        expect(w.findComponent(TaoScrollTop).exists()).toBe(true);
        expect(w.findComponent(TaoScrollTop).props('ariaLabel')).toBe('Наверх');
        w.unmount();
    });

    it('«Наверх» лежит вне контейнера запросов .app (иначе его position: fixed считался бы от контейнера)', () => {
        const w = mountApp();
        expect(w.find('.app').findComponent(TaoScrollTop).exists()).toBe(false);
        expect(w.findComponent(TaoScrollTop).exists()).toBe(true);
        w.unmount();
    });

    it('на экране выбора языка кнопки «Наверх» нет', () => {
        localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1 }));
        const pinia = createPinia();
        setActivePinia(pinia);
        const w = mount(App, { global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
        expect(w.text()).toContain('Язык · Language');
        expect(w.findComponent(TaoScrollTop).exists()).toBe(false);
        w.unmount();
    });

    describe('подтверждение снятия отметки с пункта', () => {
        const withItem = (done: boolean) => [
            makeTask({ id: 'a', date: '2026-10-20', checklist: [{ text: 'Хлеб', done, changedAt: done ? '2026-10-01T10:00:00.000Z' : null }] }),
        ];
        const checkbox = (w: ReturnType<typeof mountApp>) => w.find('.list input[type="checkbox"]');
        it('выключено: снятие отметки сразу применяется и время стирается', async () => {
            const w = mountApp(withItem(true), 'ru', { confirmUncheck: false });
            await checkbox(w).setValue(false);
            await vi.waitFor(() => expect(stored()[0]!.checklist[0]).toEqual({ text: 'Хлеб', done: false, changedAt: null }));
            expect(mocks.asked).toEqual([]);
            w.unmount();
        });

        it('включено, ответ «да»: спрашивает с названием пункта, затем снимает и стирает время', async () => {
            const w = mountApp(withItem(true), 'ru', { confirmUncheck: true });
            await checkbox(w).setValue(false);

            await vi.waitFor(() => expect(stored()[0]!.checklist[0]!.done).toBe(false));
            expect(mocks.asked).toEqual(['Подтвердите действие', 'Снять отметку с пункта "Хлеб"? Время отметки будет сброшено.']);
            expect(stored()[0]!.checklist[0]!.changedAt).toBeNull();
            w.unmount();
        });

        it('включено, ответ «нет»: отметка и время остаются, чекбокс возвращается в отмеченное положение', async () => {
            mocks.answer = false;
            const w = mountApp(withItem(true), 'ru', { confirmUncheck: true });
            const box = () => checkbox(w).element as HTMLInputElement;
            expect(box().checked).toBe(true);

            await checkbox(w).setValue(false); // нативный чекбокс уже переключился...
            await vi.waitFor(() => expect(mocks.asked).toHaveLength(2));
            await nextTick();
            await nextTick();

            expect(box().checked).toBe(true); // ...но после отказа снова отмечен
            expect(stored()[0]!.checklist[0]).toEqual({ text: 'Хлеб', done: true, changedAt: '2026-10-01T10:00:00.000Z' });
            w.unmount();
        });

        it('подтверждение нужно только при снятии: постановка отметки идёт без вопросов', async () => {
            const w = mountApp(withItem(false), 'ru', { confirmUncheck: true });
            await checkbox(w).setValue(true);
            await vi.waitFor(() => expect(stored()[0]!.checklist[0]!.done).toBe(true));
            expect(mocks.asked).toEqual([]);
            w.unmount();
        });

        it('по умолчанию включено', async () => {
            const w = mountApp(withItem(true));
            await checkbox(w).setValue(false);
            await vi.waitFor(() => expect(mocks.asked).toHaveLength(2));
            w.unmount();
        });

        it('переключатель в настройках включает подтверждение и сохраняется', async () => {
            const w = mountApp(withItem(true), 'ru', { confirmUncheck: false });
            await w.find('button[aria-label="Настройки"]').trigger('click');
            await nextTick();

            const switches = [...document.body.querySelectorAll<HTMLElement>('[role="switch"]')];
            expect(switches).toHaveLength(2);
            switches[1]!.click();
            await nextTick();

            expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').confirmUncheck).toBe(true);
            expect(document.body.textContent).toContain('Подтверждать снятие отметки с задачи');

            await checkbox(w).setValue(false);
            await vi.waitFor(() => expect(mocks.asked).toHaveLength(2)); // настройка подействовала сразу, без перезагрузки
            w.unmount();
        });
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI, { TaoDropdownMenu } from '@1337exp/taoui';
import TaskForm from '@/components/TaskForm.vue';
import type { TaskFormMode } from '@/components/TaskForm.vue';
import { applyLocale } from '@/i18n';
import { KEYS } from '@/storage/local';
import { useTasksStore } from '@/stores/tasks';
import type { Task } from '@/domain/types';
import { makeTask } from './helpers';

// confirm() подменяем: настоящий монтирует свой хост в body
const mocks = vi.hoisted(() => ({ answer: true, asked: [] as string[] }));

vi.mock('@1337exp/taoui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@1337exp/taoui')>();
    const confirm = (title: string) => {
        mocks.asked.push(title);
        const builder: Record<string, unknown> = { then: (resolve: (value: boolean) => void) => resolve(mocks.answer) };
        for (const name of ['message', 'ok', 'cancel', 'danger']) builder[name] = () => builder;
        return builder;
    };
    return { ...original, confirm };
});

// ---------------------------------------------------------------- помощники

const q = <T extends Element>(selector: string) => document.body.querySelector<T>(selector)!;
const dateInput = () => q<HTMLInputElement>('input[placeholder="dd.mm.yyyy"]');
const noteInput = () => q<HTMLTextAreaElement>('.tao-modal textarea');
const addItemInput = () => q<HTMLInputElement>('.add-item input');
const itemInputs = () => [...document.body.querySelectorAll<HTMLInputElement>('.items input[type="text"]')];
const byLabel = (label: string) => q<HTMLButtonElement>(`button[aria-label="${label}"]`);
const submitButton = () => q<HTMLButtonElement>('.tao-modal__footer .submit');
const cancelButton = () => document.body.querySelectorAll<HTMLButtonElement>('.tao-modal__footer button')[0]!;

// Каждое действие пользователя — отдельное событие, между ними проходит отрисовка; помощники это воспроизводят.
async function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
}
const blur = async (el: HTMLElement) => { el.dispatchEvent(new Event('blur')); await nextTick(); };
const enter = async (el: HTMLElement) => { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); await nextTick(); };
const click = async (el: HTMLElement) => { el.click(); await nextTick(); };
const settle = async () => { await vi.advanceTimersByTimeAsync(0); for (let i = 0; i < 5; i++) await Promise.resolve(); await nextTick(); };

interface Mounted {
    w: VueWrapper;
    store: ReturnType<typeof useTasksStore>;
    open: () => boolean;
}

function mountForm(mode: TaskFormMode = 'create', task: Task | null = null, tasks: Task[] = []): Mounted {
    if (tasks.length) localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks }));
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useTasksStore();
    let isOpen = true;

    const w = mount(TaskForm, {
        props: { modelValue: true, mode, task, 'onUpdate:modelValue': (v: boolean) => { isOpen = v; void w.setProps({ modelValue: v }); } },
        global: { plugins: [pinia, TaoUI] },
        attachTo: document.body,
    });
    return { w, store, open: () => isOpen };
}

describe('форма задачи', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        applyLocale('ru');
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
        vi.setSystemTime(new Date(2026, 9, 6, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    describe('закрытие без сохранения', () => {
        beforeEach(() => {
            mocks.answer = true;
            mocks.asked.length = 0;
        });

        it('пустая форма закрывается сразу, без вопроса', async () => {
            const { w, open } = mountForm();
            await click(cancelButton());
            await settle();
            expect(mocks.asked).toEqual([]);
            expect(open()).toBe(false);
            w.unmount();
        });

        it('если что-то введено, «Отменить» спрашивает; «Закрыть» закрывает, данные пропадают', async () => {
            const { w, open } = mountForm();
            await type(noteInput(), 'черновик');
            await click(cancelButton());
            await settle();
            expect(mocks.asked).toEqual(['Закрыть без сохранения?']);
            expect(open()).toBe(false);
            w.unmount();
        });

        it('«Продолжить» оставляет форму открытой и ничего не теряет', async () => {
            mocks.answer = false;
            const { w, open } = mountForm();
            await type(noteInput(), 'черновик');
            await click(cancelButton());
            await settle();
            expect(open()).toBe(true);
            expect(noteInput().value).toBe('черновик');
            w.unmount();
        });

        it('вопрос задаёт и крестик с Escape: любое закрытие, не только кнопка', async () => {
            mocks.answer = false;
            const { w, open } = mountForm();
            await type(noteInput(), 'черновик');
            await click(q<HTMLButtonElement>('.tao-modal__close'));
            await settle();
            expect(mocks.asked).toHaveLength(1);
            expect(open()).toBe(true);
            w.unmount();
        });

        it('клик мимо: диалог появляется только после click этого нажатия, иначе click по его фону сразу отменил бы его', async () => {
            const { w, open } = mountForm();
            await type(noteInput(), 'черновик');
            const overlay = q<HTMLElement>('.tao-modal-overlay');
            overlay.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            overlay.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
            await settle();
            expect(mocks.asked).toEqual([]); // click этого же нажатия ещё впереди (на тачскрине он может прийти поздно)

            overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            await settle();
            expect(mocks.asked).toEqual(['Закрыть без сохранения?']);
            expect(open()).toBe(false);
            w.unmount();
        });

        it('если click так и не пришёл (жест оборвался), диалог всё равно появляется по таймеру', async () => {
            const { w } = mountForm();
            await type(noteInput(), 'черновик');
            const overlay = q<HTMLElement>('.tao-modal-overlay');
            overlay.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
            overlay.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
            await vi.advanceTimersByTimeAsync(399);
            expect(mocks.asked).toEqual([]);

            await vi.advanceTimersByTimeAsync(5);
            await settle();
            expect(mocks.asked).toHaveLength(1);
            w.unmount();
        });

        it('текст в поле нового пункта, который не успели добавить, тоже считается вводом', async () => {
            const { w } = mountForm();
            await type(addItemInput(), 'хлеб');
            await click(cancelButton());
            await settle();
            expect(mocks.asked).toHaveLength(1);
            w.unmount();
        });

        it('при изменении без правок вопроса нет, после правки есть', async () => {
            const task = makeTask({ id: 'a', date: '2026-10-20', note: 'старая' });
            const { w, open } = mountForm('edit', task, [task]);
            await click(cancelButton());
            await settle();
            expect(mocks.asked).toEqual([]);
            expect(open()).toBe(false);
            w.unmount();

            const again = mountForm('edit', task, [task]);
            await type(noteInput(), 'новая');
            await click(cancelButton());
            await settle();
            expect(mocks.asked).toHaveLength(1);
            again.w.unmount();
        });

        it('сохранение закрывает форму без вопроса', async () => {
            const { w, open } = mountForm();
            await type(noteInput(), 'заметка');
            await click(submitButton());
            await settle();
            expect(mocks.asked).toEqual([]);
            expect(open()).toBe(false);
            w.unmount();
        });
    });

    describe('создание', () => {
        it('открывается с сегодняшней датой и пустыми полями', () => {
            const { w } = mountForm();
            expect(q('.tao-modal__title').textContent).toBe('Новая заметка');
            expect(dateInput().value).toBe('06.10.2026');
            expect(noteInput().value).toBe('');
            expect(submitButton().textContent).toContain('Добавить');
            w.unmount();
        });

        it('цифровая клавиатура на самом поле даты', () => {
            const { w } = mountForm();
            expect(dateInput().getAttribute('inputmode')).toBe('numeric');
            w.unmount();
        });

        it('полный сценарий: быстрый ввод даты, заметка, пункты, повтор → задача создана', async () => {
            const { w, store, open } = mountForm();

            await type(dateInput(), '8');
            await blur(dateInput());
            await nextTick();
            expect(dateInput().value).toBe('08.10.2026'); // быстрый ввод превратился в полную дату

            await type(noteInput(), '  Купить хлеб  ');

            await type(addItemInput(), 'молоко');
            await enter(addItemInput());
            await type(addItemInput(), 'яйца');
            await click(byLabel('Добавить пункт'));
            await nextTick();
            expect(itemInputs().map((i) => i.value)).toEqual(['яйца', 'молоко']); // новые пункты — сверху
            expect(addItemInput().value).toBe(''); // поле для нового пункта очищено

            w.findComponent(TaoDropdownMenu).vm.$emit('selected', 'weekly');
            await nextTick();
            expect(q('.repeat').textContent).toContain('Каждую неделю');

            await click(submitButton());
            await nextTick();

            expect(store.tasks).toHaveLength(1);
            expect(store.tasks[0]).toMatchObject({
                date: '2026-10-08',
                anchor: '2026-10-08',
                note: 'Купить хлеб',
                recurrence: 'weekly',
                done: false,
                checklist: [{ text: 'яйца', done: false, changedAt: null }, { text: 'молоко', done: false, changedAt: null }],
            });
            expect(w.emitted('saved')).toHaveLength(1);
            expect(open()).toBe(false);
            w.unmount();
        });

        it('кнопки +7, +30, +180 прибавляют дни к дате в поле', async () => {
            const { w } = mountForm();
            expect([...document.body.querySelectorAll('.quick-shift')].map((b) => b.textContent?.trim())).toEqual(['+7', '+30', '+180']);

            await click(byLabel('Прибавить дней: 7'));
            expect(dateInput().value).toBe('13.10.2026');
            await click(byLabel('Прибавить дней: 30'));
            expect(dateInput().value).toBe('12.11.2026'); // отсчёт от того, что уже в поле, а не от сегодняшнего дня
            await click(byLabel('Прибавить дней: 180'));
            expect(dateInput().value).toBe('11.05.2027');
            w.unmount();
        });

        it('быстрые сдвиги понимают быстрый ввод и не боятся мусора в поле', async () => {
            const { w } = mountForm();
            await type(dateInput(), '20');
            await click(byLabel('Прибавить дней: 7'));
            expect(dateInput().value).toBe('27.10.2026');

            await type(dateInput(), 'abc');
            await click(byLabel('Прибавить дней: 7'));
            expect(dateInput().value).toBe('13.10.2026'); // от сегодняшнего дня
            w.unmount();
        });

        it('кнопки «день назад / день вперёд»', async () => {
            const { w } = mountForm();
            await click(byLabel('Следующий день'));
            await click(byLabel('Следующий день'));
            await nextTick();
            expect(dateInput().value).toBe('08.10.2026');

            await click(byLabel('Предыдущий день'));
            await nextTick();
            expect(dateInput().value).toBe('07.10.2026');
            w.unmount();
        });

        it('текст, который не успели добавить кнопкой «+», не теряется', async () => {
            const { w, store } = mountForm();
            await type(addItemInput(), 'не нажал плюс');
            await click(submitButton());
            await nextTick();

            expect(store.tasks[0]!.checklist.map((i) => i.text)).toEqual(['не нажал плюс']);
            w.unmount();
        });

        it('пункт можно удалить, а пустые пункты не сохраняются', async () => {
            const { w, store } = mountForm();
            for (const text of ['a', 'b', 'c']) {
                await type(addItemInput(), text);
                await enter(addItemInput());
            }
            await nextTick();
            expect(itemInputs().map((i) => i.value)).toEqual(['c', 'b', 'a']);

            await click(document.body.querySelectorAll<HTMLButtonElement>('button[aria-label="Удалить пункт"]')[1]!); // «b»
            await nextTick();
            expect(itemInputs().map((i) => i.value)).toEqual(['c', 'a']);

            await type(itemInputs()[0]!, '   '); // очистили текст пункта
            await click(submitButton());
            await nextTick();
            expect(store.tasks[0]!.checklist.map((i) => i.text)).toEqual(['a']);
            w.unmount();
        });

        it('чек-лист без заметки допустим', async () => {
            const { w, store } = mountForm();
            await type(addItemInput(), 'только пункт');
            await enter(addItemInput());
            await nextTick();
            await click(submitButton());
            await nextTick();
            expect(store.tasks).toHaveLength(1);
            w.unmount();
        });
    });

    describe('проверки', () => {
        it('пустая задача: ошибка у заметки, окно остаётся открытым, ничего не сохранено', async () => {
            const { w, store, open } = mountForm();
            await click(submitButton());
            await nextTick();

            expect(q('.tao-modal').textContent).toContain('Введите текст заметки или добавьте хотя бы один пункт списка');
            expect(open()).toBe(true);
            expect(store.empty).toBe(true);
            w.unmount();
        });

        it('непонятная дата: ошибка у даты', async () => {
            const { w, store } = mountForm();
            await type(noteInput(), 'дело');
            await type(dateInput(), 'abc');
            await click(submitButton());
            await nextTick();

            expect(q('.tao-modal').textContent).toContain('Проверьте формат ввода даты и/или значения');
            expect(dateInput().value).toBe('abc'); // введённое не стирается
            expect(store.empty).toBe(true);
            w.unmount();
        });

        it('дата старше 365 дней: ошибка', async () => {
            const { w, store } = mountForm();
            await type(noteInput(), 'дело');
            await type(dateInput(), '01.01.2025');
            await click(submitButton());
            await nextTick();

            expect(q('.tao-modal').textContent).toContain('Дата не может быть раньше, чем 365 дней назад');
            expect(store.empty).toBe(true);
            w.unmount();
        });

        it('ошибка видна, даже если вместе с ней в список добавился ожидающий пункт', async () => {
            const { w, store } = mountForm();
            await type(dateInput(), 'abc');
            await type(addItemInput(), 'не добавлен кнопкой');
            await click(submitButton());

            expect(q('.tao-modal').textContent).toContain('Проверьте формат ввода даты и/или значения');
            expect(store.empty).toBe(true);
            w.unmount();
        });

        it('новый пункт снимает ошибку «пустая задача»', async () => {
            const { w } = mountForm();
            await click(submitButton());
            expect(q('.tao-modal').textContent).toContain('Введите текст заметки или добавьте');

            await type(addItemInput(), 'пункт');
            await enter(addItemInput());
            expect(q('.tao-modal').textContent).not.toContain('Введите текст заметки или добавьте');
            w.unmount();
        });

        it('после правки ошибка исчезает', async () => {
            const { w } = mountForm();
            await click(submitButton());
            await nextTick();
            expect(q('.tao-modal').textContent).toContain('Введите текст заметки');

            await type(noteInput(), 'дело');
            await nextTick();
            expect(q('.tao-modal').textContent).not.toContain('Введите текст заметки или добавьте');
            w.unmount();
        });
    });

    describe('изменение', () => {
        const task = makeTask({
            id: 'a',
            date: '2026-10-20',
            note: 'старая',
            recurrence: 'monthly',
            checklist: [{ text: 'сделано', done: true, changedAt: '2026-10-01T10:00:00.000Z' }, { text: 'в работе', done: false, changedAt: null }],
        });

        it('форма заполнена данными задачи, заголовок и кнопка соответствуют режиму', () => {
            const { w } = mountForm('edit', task, [task]);
            expect(q('.tao-modal__title').textContent).toBe('Изменить');
            expect(submitButton().textContent).toContain('Сохранить');
            expect(dateInput().value).toBe('20.10.2026');
            expect(noteInput().value).toBe('старая');
            expect(itemInputs().map((i) => i.value)).toEqual(['сделано', 'в работе']);
            expect(q('.repeat').textContent).toContain('Каждый месяц');
            w.unmount();
        });

        it('сохраняет в ту же задачу; отметки пунктов и состояние остаются', async () => {
            const { w, store, open } = mountForm('edit', task, [task]);
            await type(noteInput(), 'новая заметка');
            await type(dateInput(), '25.10.2026');
            await click(submitButton());
            await nextTick();

            expect(store.tasks.filter((t) => t.id === 'a')).toHaveLength(1);
            const saved = store.tasks.find((t) => t.id === 'a')!;
            expect(saved).toMatchObject({ date: '2026-10-25', note: 'новая заметка', anchor: '2026-10-25' });
            expect(saved.checklist[0]).toEqual({ text: 'сделано', done: true, changedAt: '2026-10-01T10:00:00.000Z' });
            expect(open()).toBe(false);
            w.unmount();
        });

        it('отмена ничего не меняет', async () => {
            const { w, store, open } = mountForm('edit', task, [task]);
            await type(noteInput(), 'не сохранится');
            await click(cancelButton());
            await settle();

            expect(open()).toBe(false);
            expect(store.tasks[0]!.note).toBe('старая');
            w.unmount();
        });
    });

    describe('клонирование', () => {
        const source = makeTask({
            id: 'src',
            date: '2026-10-20',
            note: 'образец',
            recurrence: 'weekly',
            checklist: [{ text: 'пункт', done: true, changedAt: '2026-10-01T10:00:00.000Z' }],
        });

        it('форма заполнена данными образца, отметки сброшены, повтор не копируется', () => {
            const { w } = mountForm('clone', source, [source]);
            expect(q('.tao-modal__title').textContent).toBe('Клонировать заметку');
            expect(submitButton().textContent).toContain('Добавить');
            expect(noteInput().value).toBe('образец');
            expect(q('.repeat').textContent).toContain('-');
            expect(itemInputs().map((i) => i.value)).toEqual(['пункт']);
            w.unmount();
        });

        it('создаёт новую задачу, образец остаётся', async () => {
            const { w, store } = mountForm('clone', source, [source]);
            await type(dateInput(), '27.10.2026');
            await click(submitButton());
            await nextTick();

            expect(store.tasks).toHaveLength(2);
            const ids = store.tasks.map((t) => t.id);
            expect(ids).toContain('src');
            const clone = store.tasks.find((t) => t.id !== 'src')!;
            expect(clone).toMatchObject({ date: '2026-10-27', note: 'образец', recurrence: 'none', done: false });
            expect(clone.checklist[0]).toEqual({ text: 'пункт', done: false, changedAt: null });
            w.unmount();
        });
    });

    it('каждое открытие начинается с чистой формы', async () => {
        const { w } = mountForm();
        await type(noteInput(), 'черновик');
        await click(cancelButton());
        await settle();

        await w.setProps({ modelValue: true });
        await nextTick();
        expect(noteInput().value).toBe('');
        w.unmount();
    });

    describe('оформление формы', () => {
        it('подписей у полей нет, а доступные имена заданы самим полям', () => {
            const { w } = mountForm();
            expect(document.body.querySelectorAll('.tao-form-field__label')).toHaveLength(0);

            expect(dateInput().getAttribute('aria-label')).toBe('Дата');
            expect(noteInput().getAttribute('aria-label')).toBe('Заметка');
            expect(addItemInput().getAttribute('aria-label')).toBe('Список задач');
            w.unmount();
        });

        it('имена есть и у полей добавленных пунктов, и на английском', async () => {
            applyLocale('en');
            const { w } = mountForm();
            expect(dateInput().getAttribute('aria-label')).toBe('Date');

            await type(addItemInput(), 'пункт');
            await enter(addItemInput());
            expect(itemInputs()[0]!.getAttribute('aria-label')).toBe('List of tasks');
            w.unmount();
        });

        it('под полем даты две строки подсказки: формат и сегодняшняя дата', () => {
            const { w } = mountForm();
            const hints = q('.date-hints');
            const lines = [...hints.children].map((line) => line.textContent?.replace(/\s+/g, ' ').trim());
            expect(lines).toEqual(['Формат даты: dd, dd.mm, dd.mm.yyyy', 'Сегодняшняя дата: 06.10.2026']);
            expect(dateInput().getAttribute('aria-describedby')).toBe(hints.id); // поле связано с подсказкой для скринридеров
            w.unmount();
        });

        it('клик по «Сегодняшняя дата» подставляет её в поле', async () => {
            const { w } = mountForm();
            await type(dateInput(), '20.12.2026');
            expect(dateInput().value).toBe('20.12.2026');

            const today = q<HTMLButtonElement>('.today-button');
            expect(today.textContent?.trim()).toBe('06.10.2026');
            expect(today.getAttribute('aria-label')).toBe('Подставить сегодняшнюю дату');
            await click(today);
            expect(dateInput().value).toBe('06.10.2026');

            // и когда в поле мусор
            await type(dateInput(), 'abc');
            await click(today);
            expect(dateInput().value).toBe('06.10.2026');
            w.unmount();
        });

        it('кнопка удаления пункта стоит слева от поля, красная ghost-кнопка, а отключённых чекбоксов нет', async () => {
            const { w } = mountForm();
            for (const text of ['a', 'b']) {
                await type(addItemInput(), text);
                await enter(addItemInput());
            }

            expect(document.body.querySelectorAll('.items input[type="checkbox"]')).toHaveLength(0);
            for (const row of document.body.querySelectorAll('.items .item')) {
                const [first, second] = [...row.children];
                expect(first!.getAttribute('aria-label')).toBe('Удалить пункт'); // сначала удаление
                expect(first!.className).toContain('tao-button--ghost');
                expect(first!.className).toContain('tao-button--tone-danger');
                expect(second!.querySelector('input')).not.toBeNull(); // затем само поле
                expect(row.children).toHaveLength(2); // справа ничего: туда большой палец не должен попадать
            }
            w.unmount();
        });

        it('удалённого пункта нет в сохранённой задаче, а отметки остальных сохраняются при изменении', async () => {
            const task = makeTask({ id: 'e', date: '2026-10-20', checklist: [{ text: 'делал', done: true, changedAt: '2026-10-01T10:00:00.000Z' }, { text: 'ещё нет', done: false, changedAt: null }] });
            const { w, store } = mountForm('edit', task, [task]);

            await click(document.body.querySelectorAll<HTMLButtonElement>('button[aria-label="Удалить пункт"]')[1]!);
            await click(submitButton());
            expect(store.tasks[0]!.checklist).toEqual([{ text: 'делал', done: true, changedAt: '2026-10-01T10:00:00.000Z' }]);
            w.unmount();
        });

        it('«Отменить» — ghost-кнопка, «Добавить» — primary', () => {
            const { w } = mountForm();
            expect(cancelButton().className).toContain('tao-button--ghost');
            expect(cancelButton().className).not.toContain('tao-button--text');
            expect(submitButton().className).toContain('tao-button--primary');
            w.unmount();
        });

        it('«Повтор» — одна кнопка (dropdown), без вложенной второй: hover срабатывает один раз', () => {
            const { w } = mountForm();
            const trigger = q('.repeat .tao-dropdown-menu__button');
            expect(trigger.textContent?.trim()).toBe('Повтор: -');
            expect(trigger.querySelector('button')).toBeNull();
            expect(trigger.querySelector('.tao-button')).toBeNull();
            w.unmount();
        });
    });

    it('английский интерфейс', () => {
        applyLocale('en');
        const { w } = mountForm();
        expect(q('.tao-modal__title').textContent).toBe('New note');
        expect(q('.tao-modal').textContent).toContain('Date format:');
        expect(q('.repeat').textContent).toContain('Repeat: -');
        expect(submitButton().textContent).toContain('Add');
        w.unmount();
    });
});

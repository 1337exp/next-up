import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI, { TaoDropdownMenu } from '@1337exp/taoui';
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

function mountApp(tasks: Task[] = [], locale: 'ru' | 'en' = 'ru') {
    localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale }));
    if (tasks.length) localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks }));
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(App, { global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
}

const stored = () => (JSON.parse(localStorage.getItem(KEYS.tasks) ?? 'null') as { tasks: Task[] } | null)?.tasks ?? [];
const tabButton = (w: ReturnType<typeof mountApp>, text: string) => w.findAll('[role="tab"], button').find((b) => b.text().startsWith(text))!;

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
        expect(w.text()).toContain('Активные (0)');
        expect(w.text()).toContain('Архив (0)');
        w.unmount();
    });

    it('вкладки показывают количество, переключение меняет список', async () => {
        const w = mountApp([
            makeTask({ id: 'a', date: '2026-10-10', note: 'активная-1' }),
            makeTask({ id: 'b', date: '2026-10-20', note: 'активная-2' }),
            makeTask({ id: 'c', date: '2026-10-01', note: 'архивная-1', rolled: true }),
        ]);
        expect(w.text()).toContain('Активные (2)');
        expect(w.text()).toContain('Архив (1)');
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
        expect(w.text()).toContain('Active (1)');
        w.unmount();
    });

    describe('действия над задачей', () => {
        const menuOf = (w: ReturnType<typeof mountApp>) => w.findComponent(TaskCard).findComponent(TaoDropdownMenu);

        it('«Завершено»: уходит в архив, сохраняется', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', note: 'дело' })]);
            menuOf(w).vm.$emit('selected', 'done');
            await nextTick();

            expect(w.text()).toContain('Активные (0)');
            expect(w.text()).toContain('Архив (1)');
            expect(stored()[0]).toMatchObject({ id: 'a', done: true });
            w.unmount();
        });

        it('отметка пункта чек-листа сохраняется', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', checklist: [{ text: 'шаг', done: false, changedAt: null }] })]);
            await w.find('input[type="checkbox"]').setValue(true);

            expect(stored()[0]!.checklist[0]!.done).toBe(true);
            w.unmount();
        });

        it('удаление спрашивает подтверждение с названием задачи; «нет» ничего не удаляет, «да» удаляет', async () => {
            const w = mountApp([makeTask({ id: 'a', date: '2026-10-10', note: 'Купить хлеб' })]);

            mocks.answer = false;
            menuOf(w).vm.$emit('selected', 'remove');
            await vi.waitFor(() => expect(mocks.asked.length).toBe(2));
            expect(mocks.asked).toEqual(['Подтвердите действие', 'Вы действительно хотите удалить запись: "Купить хлеб"?']);
            expect(w.text()).toContain('Активные (1)');
            expect(stored()).toHaveLength(1);

            mocks.answer = true;
            menuOf(w).vm.$emit('selected', 'remove');
            await vi.waitFor(() => expect(w.text()).toContain('Активные (0)'));
            expect(stored()).toHaveLength(0);
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
        expect(w.text()).toContain('Active (1)');
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

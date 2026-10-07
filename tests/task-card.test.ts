import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TaoUI, { TaoDropdownMenu } from '@1337exp/taoui';
import TaskCard from '@/components/TaskCard.vue';
import { applyLocale } from '@/i18n';
import type { Task } from '@/domain/types';
import { makeTask } from './helpers';

const today = '2026-10-06'; // вторник

function mountCard(task: Task, props: Record<string, unknown> = {}) {
    return mount(TaskCard, { props: { task, today, ...props }, global: { plugins: [TaoUI] } });
}

const actionsOf = (w: ReturnType<typeof mountCard>) => w.findComponent(TaoDropdownMenu).props('actions') ?? [];
const actionIds = (w: ReturnType<typeof mountCard>) => actionsOf(w).map((a) => a.id);

describe('TaskCard', () => {
    beforeEach(() => applyLocale('ru'));

    describe('бейдж срока', () => {
        it('сегодня, скоро, далеко', () => {
            expect(mountCard(makeTask({ date: today })).text()).toContain('Сегодня');
            expect(mountCard(makeTask({ date: '2026-10-09' })).text()).toContain('Дней: 3');
            expect(mountCard(makeTask({ date: '2026-11-20' })).text()).toContain('Дней: 45');
        });

        it('цвет: сегодня — success, до 7 дней — danger, дальше — neutral', () => {
            const tone = (date: string) => mountCard(makeTask({ date })).findAll('.tag')[0]!.html();
            expect(tone(today)).toMatch(/success/);
            expect(tone('2026-10-13')).toMatch(/danger/);
            expect(tone('2026-10-14')).not.toMatch(/danger|success/);
        });

        it('у задач с прошедшим сроком бейджа дней нет, а завершённая заранее его сохраняет (как в старом приложении)', () => {
            const past = mountCard(makeTask({ date: '2026-10-01' }));
            expect(past.text()).not.toMatch(/Дней|Сегодня/);
            expect(mountCard(makeTask({ date: '2026-10-10', done: true })).text()).toContain('Дней: 4');
        });
    });

    it('день недели и дата на языке интерфейса; повтор — подписью', () => {
        const ru = mountCard(makeTask({ date: today, recurrence: 'weekly' }));
        expect(ru.text()).toContain('Вт');
        expect(ru.text()).toContain('06.10.2026');
        expect(ru.text()).toContain('/ Каждую неделю');

        applyLocale('en');
        const en = mountCard(makeTask({ date: today, recurrence: 'semiannual' }));
        expect(en.text()).toContain('Tue');
        expect(en.text()).toContain('/ Every 6 months');
        expect(mountCard(makeTask({ date: today })).text()).not.toContain(' / ');
    });

    describe('меню действий', () => {
        it('активная: завершить и удалить; «изменить» и «клонировать» только когда включено', () => {
            expect(actionIds(mountCard(makeTask({ date: '2026-10-20' })))).toEqual(['done', 'remove']);
            expect(actionIds(mountCard(makeTask({ date: '2026-10-20' }), { canEdit: true }))).toEqual(['done', 'edit', 'clone', 'remove']);
        });

        it('завершённая до срока: можно вернуть в работу', () => {
            expect(actionIds(mountCard(makeTask({ date: '2026-10-20', done: true })))).toEqual(['reopen', 'remove']);
        });

        it('срок прошёл: вернуть в работу нельзя', () => {
            expect(actionIds(mountCard(makeTask({ date: '2026-10-01' })))).toEqual(['remove']);
            expect(actionIds(mountCard(makeTask({ date: '2026-10-01', done: true })))).toEqual(['remove']);
        });

        it('выбор пункта посылает событие с задачей', () => {
            const task = makeTask({ date: '2026-10-20' });
            const w = mountCard(task, { canEdit: true });
            const menu = w.findComponent(TaoDropdownMenu);
            for (const id of ['done', 'reopen', 'edit', 'clone', 'remove']) menu.vm.$emit('selected', id);

            for (const name of ['done', 'reopen', 'edit', 'clone', 'remove']) expect(w.emitted(name), name).toEqual([[task]]);
        });

        it('подписи меню переводятся', () => {
            expect(actionsOf(mountCard(makeTask({ date: '2026-10-20' }))).map((a) => a.name)).toEqual(['Завершено', 'Удалить']);
            applyLocale('en');
            expect(actionsOf(mountCard(makeTask({ date: '2026-10-20' }))).map((a) => a.name)).toEqual(['Done', 'Delete']);
        });
    });

    describe('сворачивание далёких задач', () => {
        const far = makeTask({ date: '2026-11-15', note: 'Длинная заметка', checklist: [{ text: 'пункт', done: false, changedAt: null }] });

        it('настройка выключена: всё показано, кнопки нет', () => {
            const w = mountCard(far);
            expect(w.text()).toContain('Длинная заметка');
            expect(w.find('button[aria-label="Свернуть"]').exists()).toBe(false);
        });

        it('настройка включена: содержимое скрыто, кнопка разворачивает и сворачивает', async () => {
            const w = mountCard(far, { hideFar: true });
            expect(w.text()).not.toContain('Длинная заметка');
            expect(w.text()).not.toContain('пункт');

            await w.find('button[aria-label="Развернуть"]').trigger('click');
            expect(w.text()).toContain('Длинная заметка');
            expect(w.text()).toContain('пункт');

            await w.find('button[aria-label="Свернуть"]').trigger('click');
            expect(w.text()).not.toContain('Длинная заметка');
        });

        it('граница: 21 день ещё показывается, 22 — уже сворачивается', () => {
            const note = (date: string) => mountCard(makeTask({ date, note: 'текст' }), { hideFar: true }).text().includes('текст');
            expect(note('2026-10-27')).toBe(true); // +21
            expect(note('2026-10-28')).toBe(false); // +22
        });
    });

    describe('содержимое', () => {
        it('заметка рендерится как Markdown, HTML не исполняется', () => {
            const w = mountCard(makeTask({ date: today, note: '**важно** <img src=x onerror=alert(1)>' }));
            expect(w.html()).toContain('<strong>важно</strong>');
            expect(w.find('img').exists()).toBe(false);
        });

        it('чек-лист: отметка шлёт событие с индексом, время показывается только у отмеченных', async () => {
            const task = makeTask({
                date: today,
                note: '',
                checklist: [
                    { text: 'первый', done: true, changedAt: '2026-10-05T10:30:00.000Z' },
                    { text: 'второй', done: false, changedAt: null },
                ],
            });
            const w = mountCard(task);
            expect(w.findAll('.changed')).toHaveLength(1);

            await w.findAll('input[type="checkbox"]')[1]!.setValue(true);
            expect(w.emitted('toggleItem')).toEqual([[task, 1]]);
        });

        it('пустая заметка и пустой чек-лист ничего не рисуют', () => {
            const w = mountCard(makeTask({ date: today, note: '', checklist: [] }));
            expect(w.find('.note').exists()).toBe(false);
            expect(w.find('.checklist').exists()).toBe(false);
        });
    });

    describe('структура карточки', () => {
        const full = makeTask({
            date: today,
            note: 'заметка',
            checklist: [{ text: 'пункт', done: false, changedAt: null }],
        });

        it('заголовок, тело и подвал — соседние блоки одного контейнера, в этом порядке', () => {
            const parts = mountCard(full).find('.content').element.children;
            expect([...parts].map((el) => `${el.tagName.toLowerCase()}.${el.className.split(' ')[0]}`)).toEqual(['header.header', 'div.body', 'footer.footer']);
        });

        it('отсутствующие части не рендерятся (иначе между ними остались бы пустые отступы)', () => {
            const onlyHeader = mountCard(makeTask({ date: today, note: '', checklist: [] }));
            expect(onlyHeader.find('.content').element.children).toHaveLength(1);

            const noList = mountCard(makeTask({ date: today, note: 'заметка', checklist: [] }));
            expect([...noList.find('.content').element.children].map((el) => el.className.split(' ')[0])).toEqual(['header', 'body']);
        });

        it('заметка живёт в теле, чек-лист — в подвале', () => {
            const w = mountCard(full);
            expect(w.find('.body').text()).toContain('заметка');
            expect(w.find('.footer').text()).toContain('пункт');
            expect(w.find('.header').text()).not.toContain('заметка');
        });
    });

    describe('копирование даты', () => {
        it('по клику на саму дату, без отдельной иконки', async () => {
            const writeText = vi.fn(async () => undefined);
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

            const w = mountCard(makeTask({ date: today }));
            expect(w.find('.tao-copy__button').exists()).toBe(false);

            await w.find('button.date').trigger('click');
            expect(writeText).toHaveBeenCalledWith('06.10.2026');
        });

        it('подсказки на языке интерфейса', () => {
            expect(mountCard(makeTask({ date: today })).find('button.date').attributes('title')).toBe('Копировать');
            applyLocale('en');
            expect(mountCard(makeTask({ date: today })).find('button.date').attributes('title')).toBe('Copy');
        });
    });
});

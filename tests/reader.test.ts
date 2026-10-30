import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaoUI from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { addDays, todayIso } from '@/core/date';
import { setLocale } from '@/i18n';
import NoteView from '@/ui/editor/NoteView.vue';
import { useEditor } from '@/ui/editor/useEditor';

const today = todayIso();

beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    setLocale('ru');
    setActivePinia(createPinia());
});
afterEach(() => {
    useEditor().close();
    vi.useRealTimers();
});

const live = (store: ReturnType<typeof useNotesStore>) => store.notes.filter((n) => n.deletedAt === null);

function openRead(input: { body: string; items?: { id: string; text: string; doneAt: number | null }[] }) {
    const store = useNotesStore();
    store.add({ due: addDays(today, 3), body: input.body, items: input.items ?? [], repeat: null });
    useEditor().openRead(live(store)[0]!);
    return { store, wrapper: mount(NoteView, { global: { plugins: [TaoUI] } }) };
}

describe('режим чтения', () => {
    it('первая строка — заголовок, остальное — текст, срок словами', () => {
        const { wrapper } = openRead({ body: 'Позвонить в банк\n\nУзнать про **договор**\n\n- справка' });
        expect(wrapper.find('.title').text()).toBe('Позвонить в банк');
        expect(wrapper.find('.body').html()).toContain('<strong>договор</strong>');
        expect(wrapper.find('.chips').text()).toContain('через 3 дня');
    });

    it('текст — это разметка, а не поле: выделять и копировать можно', () => {
        const { wrapper } = openRead({ body: 'заголовок\nтекст' });
        expect(wrapper.find('textarea').exists()).toBe(false);
        expect(wrapper.find('input[type=text]').exists()).toBe(false);
    });

    it('пункт отмечается прямо в чтении', async () => {
        const { store, wrapper } = openRead({ body: 'список', items: [{ id: 'i1', text: 'молоко', doneAt: null }] });
        await wrapper.find('.item input').setValue(true);
        expect(live(store)[0]!.items[0]!.doneAt).not.toBeNull();
        expect(wrapper.find('.item').classes()).toContain('done');
    });

    it('«Изменить» открывает правку той же заметки', async () => {
        const { store, wrapper } = openRead({ body: 'правлю' });
        await wrapper.findAll('button').find((b) => b.text().includes('Изменить'))!.trigger('click');
        expect(useEditor().state.value).toMatchObject({ mode: 'edit', source: { id: live(store)[0]!.id } });
    });

    it('в чтении только правка и закрытие: завершить, копировать и удалить можно в ленте', async () => {
        const { wrapper } = openRead({ body: 'сделать' });
        const labels = wrapper.findAll('button').map((b) => (b.attributes('aria-label') ?? b.text()).trim());
        expect(labels.some((l) => l.includes('Выполнено') || l.includes('Удалить') || l.includes('копи'))).toBe(false);
        expect(labels.some((l) => l.includes('Изменить'))).toBe(true);
        await wrapper.findAll('button').find((b) => (b.attributes('aria-label') ?? b.text()).includes('Закрыть'))!.trigger('click');
        expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('Esc закрывает чтение; удалённая заметка закрывает его сама', async () => {
        const { store, wrapper } = openRead({ body: 'x' });
        await wrapper.find('.read').trigger('keydown', { key: 'Escape' });
        expect(wrapper.emitted('close')).toHaveLength(1);

        store.remove(live(store)[0]!.id);
        await vi.advanceTimersByTimeAsync(0);
        expect(wrapper.emitted('close')!.length).toBeGreaterThan(1);
    });
});

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaoUI from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { addDays, todayIso } from '@/core/date';
import { setLocale } from '@/i18n';
import NoteEditor from '@/ui/editor/NoteEditor.vue';
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

function open(setup: () => void) {
    setup();
    return mount(NoteEditor, { global: { plugins: [TaoUI] } });
}

const live = (store: ReturnType<typeof useNotesStore>) => store.notes.filter((n) => n.deletedAt === null);

describe('редактор', () => {
    it('новая заметка появляется сама после паузы, а не после кнопки', async () => {
        const store = useNotesStore();
        const wrapper = open(() => useEditor().openCreate());

        await wrapper.find('textarea').setValue('привет #мир');
        expect(live(store)).toHaveLength(0); // пауза ещё идёт
        vi.advanceTimersByTime(700);

        expect(live(store).map((n) => n.body)).toEqual(['привет #мир']);
        expect(useEditor().state.value!.activeId).toBe(live(store)[0]!.id);
    });

    it('пока ничего не введено, ничего не создаётся и ошибки нет', async () => {
        const store = useNotesStore();
        const wrapper = open(() => useEditor().openCreate());
        await wrapper.find('textarea').setValue('   ');
        vi.advanceTimersByTime(700);

        expect(live(store)).toHaveLength(0);
        expect(wrapper.text()).not.toContain('Введите текст или добавьте');
    });

    it('правка существующей заметки сохраняется, быстрые правки склеиваются в один шаг отмены', async () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, 2), body: 'было', items: [], repeat: null });
        vi.advanceTimersByTime(5000); // отделяем создание от правок
        const note = live(store)[0]!;

        const wrapper = open(() => useEditor().openEdit(note));
        const area = wrapper.find('textarea');
        await area.setValue('ста');
        vi.advanceTimersByTime(700);
        await area.setValue('стало');
        vi.advanceTimersByTime(700);

        expect(live(store)[0]!.body).toBe('стало');
        store.undo(); // один шаг вернул всё
        expect(live(store)[0]!.body).toBe('было');
    });

    it('очистка существующей заметки показывает ошибку и не стирает сохранённое', async () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, 2), body: 'есть', items: [], repeat: null });
        const wrapper = open(() => useEditor().openEdit(live(store)[0]!));

        await wrapper.find('textarea').setValue('');
        vi.advanceTimersByTime(700);
        await vi.advanceTimersByTimeAsync(0);

        expect(live(store)[0]!.body).toBe('есть');
        expect(wrapper.text()).toContain('Введите текст или добавьте');
    });

    it('пункты: кнопка добавляет строку, Enter — следующую; пустые не сохраняются', async () => {
        const store = useNotesStore();
        const wrapper = open(() => useEditor().openCreate());
        await wrapper.find('textarea').setValue('список');

        await wrapper.find('.add-item').trigger('click');
        await wrapper.find('.item-text input').setValue('один');
        await wrapper.find('.item-text input').trigger('keydown', { key: 'Enter' });
        expect(wrapper.findAll('.item-row')).toHaveLength(2); // вторая пустая
        vi.advanceTimersByTime(700);

        expect(live(store)[0]!.items.map((i) => i.text)).toEqual(['один']);
    });

    it('клон создаёт копию сразу, оригинал остаётся, отметки сброшены, повтор не копируется', () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, 2), body: 'образец', items: [{ id: 'i', text: 'пункт', doneAt: null }], repeat: { every: 1, unit: 'week' } });
        const original = live(store)[0]!;
        store.toggleItem(original.id, 'i');

        open(() => useEditor().openClone(live(store)[0]!));

        const all = live(store).filter((n) => n.body === 'образец');
        const copy = all.find((n) => n.id !== original.id)!;
        expect(copy.items[0]!.doneAt).toBeNull();
        expect(copy.repeat).toBeNull();
        expect(all.find((n) => n.id === original.id)!.items[0]!.doneAt).not.toBeNull();
    });

    it('закрывается, когда заметку удалили', async () => {
        const store = useNotesStore();
        store.add({ due: addDays(today, 2), body: 'x', items: [], repeat: null });
        const note = live(store)[0]!;
        const wrapper = open(() => useEditor().openEdit(note));

        store.remove(note.id);
        await vi.advanceTimersByTimeAsync(0);
        expect(wrapper.emitted('close')).toBeTruthy();
    });
});

describe('клавиатура', () => {
    it('Esc в тексте закрывает редактор', async () => {
        const wrapper = open(() => useEditor().openCreate());
        await wrapper.find('textarea').trigger('keydown', { key: 'Escape' });
        expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('Esc не в тексте (например, в выборе повтора) редактор не закрывает', async () => {
        const wrapper = open(() => useEditor().openCreate());
        await wrapper.find('.add-item').trigger('keydown', { key: 'Escape' });
        expect(wrapper.emitted('close')).toBeFalsy();
    });
});

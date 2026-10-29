import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TaoUI from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { addDays, todayIso } from '@/core/date';
import { setLocale } from '@/i18n';
import { useEditor } from '@/ui/editor/useEditor';
import NoteList from '@/ui/notes/NoteList.vue';

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
    document.body.innerHTML = '';
});

function setup() {
    const store = useNotesStore();
    for (const [days, body] of [[0, 'первая'], [1, 'вторая'], [5, 'третья']] as const) store.add({ due: addDays(today, days), body, items: [], repeat: null });
    const wrapper = mount(NoteList, { props: { section: 'active' as const }, global: { plugins: [TaoUI] }, attachTo: document.body });
    return { store, wrapper };
}

const rows = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('.row[data-note-id]')];

describe('список с клавиатуры', () => {
    it('одна остановка Tab на весь список: только у первой строки tabindex=0', () => {
        const { wrapper } = setup();
        const all = rows(wrapper.element);
        expect(all).toHaveLength(3);
        expect(all.map((r) => r.tabIndex)).toEqual([0, -1, -1]);
        // кружок и меню в Tab не входят
        expect(wrapper.element.querySelector('.check')!.getAttribute('tabindex')).toBe('-1');
    });

    it('стрелки ходят по строкам, Home и End — в начало и конец, дальше краёв не уходят', () => {
        const { wrapper } = setup();
        const all = rows(wrapper.element);
        const spies = all.map((row) => vi.spyOn(row, 'focus'));
        const press = (row: HTMLElement, key: string) => void wrapper.findAll('.row').find((w) => w.element === row)!.trigger('keydown', { key });

        press(all[0]!, 'ArrowDown');
        expect(spies[1]).toHaveBeenCalledTimes(1);
        press(all[1]!, 'End');
        expect(spies[2]).toHaveBeenCalledTimes(1);
        press(all[2]!, 'ArrowDown'); // дальше конца — на последнюю же
        expect(spies[2]).toHaveBeenCalledTimes(2);
        press(all[2]!, 'Home');
        expect(spies[0]).toHaveBeenCalledTimes(1);
        press(all[0]!, 'ArrowUp'); // выше начала — на первую же
        expect(spies[0]).toHaveBeenCalledTimes(2);
    });

    it('остановка Tab переезжает на строку, которая получила фокус', async () => {
        const { wrapper } = setup();
        await wrapper.findAll('.row')[2]!.trigger('focusin');
        await wrapper.vm.$nextTick();
        expect(rows(wrapper.element).map((r) => r.tabIndex)).toEqual([-1, -1, 0]);
    });

    it('Пробел на строке завершает заметку', async () => {
        const { store, wrapper } = setup();
        const first = rows(wrapper.element)[0]!;
        first.focus();
        first.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
        await wrapper.vm.$nextTick();
        expect(store.notes.find((n) => n.body === 'первая')!.doneAt).not.toBeNull();
    });
});

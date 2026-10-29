import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SwipeRow from '@/ui/components/SwipeRow.vue';

function pointer(type: string, x: number, y: number, t: number, pointerType = 'touch'): Event {
    const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType }, timeStamp: { value: t } });
    return event;
}

function setup(props: Record<string, unknown> = {}) {
    const wrapper = mount(SwipeRow, { props: { width: 64, ...props }, slots: { default: '<p class="card">карточка</p>', actions: '<button class="act">ok</button>' } });
    const front = wrapper.find('.front').element as HTMLElement;
    front.setPointerCapture = () => {};
    return { wrapper, front };
}

/** Палец ведёт от `from` к `to` за `ms` мс. */
function drag(front: HTMLElement, from: [number, number], to: [number, number], ms: number, pointerType = 'touch') {
    front.dispatchEvent(pointer('pointerdown', from[0], from[1], 0, pointerType));
    for (let i = 1; i <= 5; i++) front.dispatchEvent(pointer('pointermove', from[0] + ((to[0] - from[0]) * i) / 5, from[1] + ((to[1] - from[1]) * i) / 5, (ms * i) / 5, pointerType));
    front.dispatchEvent(pointer('pointerup', to[0], to[1], ms, pointerType));
}

describe('SwipeRow', () => {
    it('медленный свайп влево дальше середины открывает панель', () => {
        const { wrapper, front } = setup();
        drag(front, [300, 50], [200, 52], 2000);
        expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
    });

    it('быстрый короткий взмах тоже открывает', () => {
        const { wrapper, front } = setup();
        drag(front, [300, 50], [270, 50], 60);
        expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true]);
    });

    it('малый медленный сдвиг возвращается закрытым', () => {
        const { wrapper, front } = setup();
        drag(front, [300, 50], [280, 50], 2000);
        // закрыта была, закрытой и осталась: сообщать нечего
        expect(wrapper.emitted('update:open')?.some(([open]) => open === true)).toBeFalsy();
        expect(front.style.transform).toContain('translate3d(0px');
    });

    it('вертикальная прокрутка не двигает строку', () => {
        const { wrapper, front } = setup();
        drag(front, [300, 50], [296, 200], 300);
        expect(wrapper.emitted('update:open')).toBeUndefined();
        expect(front.style.transform).toContain('translate3d(0px');
    });

    it('мышью строка не двигается, как и при disabled', () => {
        const mouse = setup();
        drag(mouse.front, [300, 50], [150, 50], 500, 'mouse');
        expect(mouse.wrapper.emitted('update:open')).toBeUndefined();

        const off = setup({ disabled: true });
        drag(off.front, [300, 50], [150, 50], 500);
        expect(off.wrapper.emitted('update:open')).toBeUndefined();
    });

    it('открытая строка закрывается обратным свайпом и касанием вне её', async () => {
        const { wrapper, front } = setup({ open: true });
        drag(front, [200, 50], [260, 50], 2000);
        expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);

        await wrapper.setProps({ open: true });
        document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
        expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false]);
        wrapper.unmount();
    });

    it('после свайпа клик по карточке гасится, а обычный клик проходит', () => {
        const { wrapper, front } = setup();
        let clicks = 0;
        wrapper.find('.card').element.addEventListener('click', () => clicks++);

        drag(front, [300, 50], [200, 50], 2000);
        wrapper.find('.card').element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(0);

        wrapper.find('.card').element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
    });
});

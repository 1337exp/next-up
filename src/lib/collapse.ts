/** Длительность раскрытия и сжатия, мс; те же 0,3 с стоят в CSS перехода `task-*` (TasksView). */
export const COLLAPSE_MS = 300;

/** Промежуток между соседями в родителе: на него сдвигаем отступ, чтобы в конце не было скачка. */
function gapOf(el: HTMLElement): number {
    const parent = el.parentElement;
    return parent ? parseFloat(getComputedStyle(parent).rowGap) || 0 : 0;
}

function clear(el: HTMLElement): void {
    el.style.height = '';
    el.style.marginBottom = '';
    el.style.opacity = '';
    el.style.removeProperty('--collapse-gap');
}

/**
 * Хуки для `<TransitionGroup>`: элемент раскрывается и сжимается по высоте.
 * CSS не умеет анимировать «auto ↔ 0», поэтому реальную высоту подставляем из JS, а плавность даёт CSS-переход.
 * `enabled` позволяет включать анимацию только для действий над задачей, а не для любой смены списка.
 */
export function useCollapseHooks(enabled: () => boolean) {
    const entering = new WeakSet<Element>();

    return {
        onBeforeLeave(node: Element): void {
            if (!enabled()) return;
            const el = node as HTMLElement;
            el.style.height = `${el.offsetHeight}px`;
            el.style.setProperty('--collapse-gap', `${gapOf(el)}px`);
        },

        onBeforeEnter(node: Element): void {
            if (!enabled()) return;
            const el = node as HTMLElement;
            entering.add(el);
            el.style.height = '0px';
            el.style.marginBottom = `${-gapOf(el)}px`;
            el.style.opacity = '0';
        },

        onEnter(node: Element, done: () => void): void {
            const el = node as HTMLElement;
            if (!entering.has(el)) return done();

            const height = el.scrollHeight;
            void el.offsetHeight; // фиксируем начальное состояние, иначе переход не запустится

            let finished = false;
            const finish = (): void => {
                if (finished) return;
                finished = true;
                el.removeEventListener('transitionend', onEnd);
                done();
            };
            const onEnd = (e: TransitionEvent): void => {
                if (e.target === el && e.propertyName === 'height') finish();
            };
            el.addEventListener('transitionend', onEnd);
            setTimeout(finish, COLLAPSE_MS + 100); // на случай, когда браузер не прислал transitionend (вкладка в фоне)

            el.style.height = `${height}px`;
            el.style.marginBottom = '0px';
            el.style.opacity = '1';
        },

        onAfterEnter(node: Element): void {
            entering.delete(node);
            clear(node as HTMLElement);
        },

        onEnterCancelled(node: Element): void {
            entering.delete(node);
            clear(node as HTMLElement);
        },
    };
}

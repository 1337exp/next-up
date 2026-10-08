<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { clampOffset, settleOpen, swipeIntent } from '@/lib/swipe';

const props = withDefaults(
    defineProps<{
        /** Ширина видимой части панели действий, px. */
        width?: number;
        /** Насколько панель заходит под карточку, px: край спрятан, и она выглядит вставкой под ней. */
        overlap?: number;
        /** Наибольшая высота панели, px: у высокой карточки кнопки не растягиваются, а остаются вкладышем по центру. */
        maxHeight?: number;
        /** Высота, которую карточка занимает, пока панель открыта: столбик кнопок должен помещаться. */
        openMinHeight?: number;
        disabled?: boolean;
    }>(),
    { width: 64, overlap: 10, maxHeight: 100, openMinHeight: 0, disabled: false },
);

const open = defineModel<boolean>('open', { default: false });

const root = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dragOffset = ref(0);

// состояние жеста; не реактивное: нужно только обработчикам
let pointerId: number | null = null;
let startX = 0;
let startY = 0;
let startOffset = 0;
let horizontal = false;

const offset = computed(() => (dragging.value ? dragOffset.value : open.value ? -props.width : 0));

const frontStyle = computed(() => ({
    transform: `translate3d(${offset.value}px, 0, 0)`,
    minHeight: open.value && props.openMinHeight ? `${props.openMinHeight}px` : undefined,
}));

function reset(): void {
    pointerId = null;
    horizontal = false;
    dragging.value = false;
}

function onDown(e: PointerEvent): void {
    // только палец и перо: мышью карточку не таскаем, у неё есть меню
    if (props.disabled || e.pointerType === 'mouse' || pointerId !== null) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startOffset = open.value ? -props.width : 0;
    horizontal = false;
}

function onMove(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!horizontal) {
        const intent = swipeIntent(dx, e.clientY - startY);
        if (intent === 'pending') return;
        if (intent === 'vertical') return reset(); // это прокрутка страницы, карточку не трогаем
        horizontal = true;
        dragging.value = true;
        root.value?.setPointerCapture(e.pointerId);
    }
    dragOffset.value = clampOffset(startOffset + dx, props.width);
}

function onUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    if (horizontal) open.value = settleOpen(dragOffset.value, props.width, open.value);
    reset();
}

// палец ушёл «в прокрутку» (браузер забрал жест): возвращаем карточку на место
function onCancel(e: PointerEvent): void {
    if (e.pointerId === pointerId) reset();
}

// пока панель открыта, тап по карточке только закрывает её и не попадает в содержимое (отметки, ссылки, меню)
function onFrontClick(e: MouseEvent): void {
    if (!open.value) return;
    e.preventDefault();
    e.stopPropagation();
    open.value = false;
}

// тап мимо карточки закрывает панель; так открытой остаётся одна карточка
function onOutside(e: PointerEvent): void {
    if (root.value && !root.value.contains(e.target as Node)) open.value = false;
}

watch(open, (value) => {
    if (value) document.addEventListener('pointerdown', onOutside, true);
    else document.removeEventListener('pointerdown', onOutside, true);
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true));
</script>

<template>
    <div ref="root" class="swipe" :class="{ 'swipe--open': open, 'swipe--dragging': dragging }" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onCancel">
        <!-- панель лежит под карточкой и открывается, когда карточку сдвигают; закрытая, она недоступна ни мышью, ни клавиатурой -->
        <div class="actions" :style="{ width: `${width + overlap}px`, paddingLeft: `${overlap}px`, maxHeight: `${maxHeight}px` }" :inert="!open">
            <slot name="actions" />
        </div>

        <div class="front" :style="frontStyle" @click.capture="onFrontClick">
            <slot />
        </div>
    </div>
</template>

<style scoped>
.swipe {
    position: relative;
    overflow: hidden;
    border-radius: var(--tao-radius-panel, 8px);
    /* вертикальную прокрутку ведёт браузер, горизонтальные жесты достаются нам */
    touch-action: pan-y;
}

.actions {
    position: absolute;
    top: 50%;
    right: 0;
    box-sizing: border-box;
    height: 100%;
    transform: translateY(-50%);
    border-radius: var(--tao-radius-panel, 8px);
    overflow: hidden;
    background: var(--tao-color-surface-raised);
    display: flex;
    flex-direction: column;
    visibility: hidden;
    transition: visibility 0s linear 0.25s;
}

.swipe--open .actions,
.swipe--dragging .actions {
    visibility: visible;
    transition-delay: 0s;
}

.front {
    position: relative;
    display: flex;
    flex-direction: column;
    transition:
        transform 0.25s ease,
        min-height 0.25s ease;
}

.front :slotted(*) {
    flex: 1 1 auto;
}

.swipe--dragging .front {
    transition: none;
}

@media (prefers-reduced-motion: reduce) {
    .front,
    .actions {
        transition: none;
    }
}
</style>

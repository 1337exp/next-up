<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { settleOpen, SwipeTracker, type Sample } from '@1337exp/taoux/gestures';

/**
 * Строка, которую пальцем сдвигают влево, открывая панель действий справа. Распознавание жеста (свайп или прокрутка,
 * скорость отпускания, куда остановиться) — `SwipeTracker` и `settleOpen` из TaoUX; здесь только движение и вёрстка.
 * Мышью не двигается: у неё есть меню.
 */
const props = withDefaults(defineProps<{ width?: number; disabled?: boolean }>(), { width: 72, disabled: false });
const open = defineModel<boolean>('open', { default: false });

const root = ref<HTMLElement | null>(null);
const front = ref<HTMLElement | null>(null);
const dragging = ref(false);
const dragOffset = ref(0);

const tracker = new SwipeTracker('x');
let pointerId: number | null = null;
let swiped = false;

const rest = computed(() => (open.value ? -props.width : 0));
const shown = computed(() => (dragging.value ? dragOffset.value : rest.value));
const clamp = (offset: number): number => Math.min(0, Math.max(-props.width, offset));
const sample = (e: PointerEvent): Sample => ({ x: e.clientX, y: e.clientY, t: e.timeStamp });

function onDown(e: PointerEvent): void {
    if (props.disabled || e.pointerType === 'mouse' || pointerId !== null) return;
    pointerId = e.pointerId;
    swiped = false;
    tracker.down(sample(e), rest.value);
}

function onMove(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    const step = tracker.move(sample(e));
    if (step.intent !== 'swipe') return;
    if (!dragging.value) {
        dragging.value = true;
        front.value?.setPointerCapture(e.pointerId); // жест продолжается, даже если палец ушёл за карточку
    }
    swiped = true;
    dragOffset.value = clamp(step.offset);
}

function finish(): void {
    dragging.value = false;
    pointerId = null;
}

function onUp(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    const release = tracker.up(sample(e));
    if (release) open.value = settleOpen({ ...release, offset: clamp(release.offset) }, { end: props.width }) !== 0;
    finish();
}

function onCancel(e: PointerEvent): void {
    if (e.pointerId !== pointerId) return;
    tracker.cancel();
    finish();
}

// конец свайпа даёт ещё и click по карточке: он не должен открывать редактор
function onClickCapture(e: MouseEvent): void {
    if (swiped) {
        e.stopPropagation();
        swiped = false;
    }
}

// открытая строка закрывается касанием вне её
function onOutside(e: PointerEvent): void {
    if (!root.value?.contains(e.target as Node)) open.value = false;
}
watch(open, (isOpen) => {
    if (isOpen) document.addEventListener('pointerdown', onOutside, true);
    else document.removeEventListener('pointerdown', onOutside, true);
});
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true));
</script>

<template>
    <div ref="root" class="swipe">
        <div class="actions" :style="{ width: `${width}px` }" :inert="!open" @click="open = false">
            <slot name="actions" />
        </div>
        <div
            ref="front"
            class="front"
            :class="{ dragging }"
            :style="{ transform: `translate3d(${shown}px, 0, 0)` }"
            @pointerdown="onDown"
            @pointermove="onMove"
            @pointerup="onUp"
            @pointercancel="onCancel"
            @click.capture="onClickCapture"
        >
            <slot />
        </div>
    </div>
</template>

<style scoped>
.swipe {
    position: relative;
    overflow: hidden;
    border-radius: var(--tao-radius-panel);
}

.actions {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    display: flex;
    flex-direction: column;
    background: var(--tao-color-surface-raised);
}

.front {
    position: relative;
    /* вертикальная прокрутка остаётся браузеру, горизонтальную ведёт SwipeTracker */
    touch-action: pan-y;
    transition: transform 0.2s ease;
}

.front.dragging {
    transition: none;
}

@media (prefers-reduced-motion: reduce) {
    .front {
        transition: none;
    }
}
</style>

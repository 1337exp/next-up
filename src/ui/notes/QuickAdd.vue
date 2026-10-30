<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { TaoButton, TaoIcon, TaoInput, toast } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { diffDays } from '@/core/date';
import { newId } from '@/core/id';
import { parseQuick } from '@/core/quick';
import { dateShort, inDaysText, repeatText, useI18n } from '@/i18n';
import { useEditor } from '@/ui/editor/useEditor';
import { usePhone } from '@/ui/shell/useWide';

/**
 * Быстрый ввод: пишем «завтра позвонить маме #дом», Enter, и заметка уже в списке со сроком.
 * Под полем видно, как понят срок и повтор.
 *
 * На телефоне три ступени: «+» (таблетка у большого пальца) → по нажатию раскрывается в поле → на пустом поле кнопка
 * превращается в «лист» и открывает полную заметку (большой текст, пункты), а как только начали печатать, снова «+»: добавить.
 * На планшете и ПК поле всегда раскрыто.
 */
const { t, locale } = useI18n();
const store = useNotesStore();
const editor = useEditor();
const phone = usePhone();

const text = ref('');
const open = ref(false);
const form = ref<HTMLFormElement | null>(null);

const expanded = computed(() => !phone.value || open.value);
const hasText = computed(() => text.value.trim() !== '');
const parsed = computed(() => parseQuick(text.value, store.today));

function dueLabel(due: string): string {
    const left = diffDays(store.today, due);
    const relative = left === 0 ? t('date.today') : left === 1 ? t('date.tomorrow') : inDaysText(left);
    return left === 0 ? relative : `${relative} · ${dateShort(locale.value, due)}`;
}

// подсказка только когда в тексте нашлось что-то про срок или повтор: иначе заметка просто «на сегодня»
const preview = computed(() => {
    const result = parsed.value;
    if (!hasText.value || (!result.foundDue && !result.foundRepeat)) return '';
    const parts = [dueLabel(result.due)];
    if (result.repeat) parts.push(repeatText(result.repeat));
    return parts.join(' · ');
});

async function expand(): Promise<void> {
    open.value = true;
    await nextTick();
    form.value?.querySelector('input')?.focus();
}

// пустое поле сворачивается обратно в «+»; с текстом остаётся раскрытым, чтобы ничего не потерять
function collapse(): void {
    if (phone.value && !hasText.value) open.value = false;
}

// фокус при раскрытии переходит с кнопки «+» (она заменяется другой) в поле: пока он не ушёл из формы совсем, не сворачиваем.
// Проверяем после того, как браузер и Vue успели его переставить, а не по relatedTarget (при тапе он бывает пустым)
function onFocusOut(): void {
    window.setTimeout(() => {
        if (!form.value?.contains(document.activeElement)) collapse();
    }, 0);
}

// крестик в поле: с текстом очищает, на пустом поле закрывает (фокус возвращается на «+»)
async function clearOrClose(): Promise<void> {
    if (hasText.value) {
        text.value = '';
        form.value?.querySelector('input')?.focus();
        return;
    }
    open.value = false;
    await nextTick();
    form.value?.querySelector<HTMLElement>('.pill-button')?.focus();
}

function openFull(): void {
    open.value = false;
    editor.openCreate();
}

function submit(): void {
    const result = parsed.value;
    if (!hasText.value) {
        // на телефоне кнопка пустого поля — «лист»: полная заметка
        if (phone.value) openFull();
        return;
    }

    const added = store.add({ due: result.due, body: result.body, items: [], repeat: result.repeat }, newId());
    if (!added.ok) {
        toast.warning(t(added.error === 'empty' ? 'editor.error.empty' : 'storage.saveFailed'));
        return;
    }
    text.value = '';
    // на телефоне после добавления таблетка сворачивается обратно в «+» (фокус — на неё, чтобы не потерять его с клавиатуры)
    if (phone.value) {
        open.value = false;
        void nextTick(() => form.value?.querySelector<HTMLElement>('.pill-button')?.focus());
    }
    toast().info().timeout(6000).message(t('quick.added', [dueLabel(result.due)])).action(t('toast.undo'), () => void store.undo());
}
</script>

<template>
    <form ref="form" class="quick" :class="{ phone, open: expanded }" @submit.prevent="submit" @keydown.esc="collapse" @focusout="onFocusOut">
        <!-- телефон: одна таблетка, ширина которой меняется от кнопки до всего ряда -->
        <div v-if="phone" class="pill tao-size-large" :class="{ open }">
            <div class="pill-field" :inert="!open">
                <TaoInput v-model="text" variant="plain" size="large" :placeholder="t('quick.placeholder')" :aria-label="t('quick.label')" :aria-describedby="preview ? 'quick-preview' : undefined" autocomplete="off" />
                <TaoButton type="button" variant="ghost" size="small" icon="tao-close" class="pill-clear" :aria-label="hasText ? t('quick.clear') : t('quick.dismiss')" :title="hasText ? t('quick.clear') : t('quick.dismiss')" @click="clearOrClose" />
            </div>
            <TaoButton
                v-if="!open"
                type="button"
                variant="primary"
                size="large"
                icon="tao-plus"
                class="pill-button"
                :aria-label="t('quick.open')"
                :aria-expanded="false"
                @click="expand"
            />
            <TaoButton v-else type="submit" variant="primary" size="large" class="pill-button" :icon="hasText ? 'tao-plus' : 'tao-file'" :aria-label="hasText ? t('quick.add') : t('quick.full')" />
        </div>

        <!-- планшет и ПК: поле всегда раскрыто -->
        <TaoInput v-else v-model="text" class="field field-wide" variant="filled" :placeholder="t('quick.placeholder')" :aria-label="t('quick.label')" :aria-describedby="preview ? 'quick-preview' : undefined" autocomplete="off" size="large">
            <template #prefix>
                <TaoButton variant="text" icon="tao-edit" :aria-label="t('quick.full')" @click="editor.openCreate()" />
            </template>
            <template #suffix>
                <kbd v-if="hasText" class="nu-kbd" aria-hidden="true">Enter</kbd>
                <TaoButton type="submit" variant="primary" icon="tao-plus" :aria-label="t('quick.add')" :disabled="!hasText" />
            </template>
        </TaoInput>

        <p v-if="preview && expanded" id="quick-preview" class="preview" aria-live="polite"><TaoIcon name="tao-calendar" />{{ preview }}</p>
    </form>
</template>

<style scoped>
.quick {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-1);
}

@media (max-width: 599px) {
    /* поле уходит в конец ленты и липнет над нижней панелью, под большим пальцем */
    .quick {
        position: sticky;
        bottom: calc(var(--nu-bar-h) + env(safe-area-inset-bottom));
        z-index: 2;
        order: 99;
        /* на коротком списке поле стоит у нижней панели, а не сразу под лентой; отрицательный нижний отступ гасит запас колонки (16 px), чтобы поле не прыгало, когда лента начинает прокручиваться */
        margin-top: auto;
        margin-bottom: calc(var(--tao-space-4) * -1);
        margin-inline: calc(var(--tao-space-4) * -1);
        padding: var(--tao-space-2) var(--tao-space-4);
        /* фон у самой таблетки: между ней и плашкой лента просвечивает */
        background: transparent;
    }
}

/* таблетка: свёрнутая — только кнопка справа, раскрытая — на весь ряд; ширина меняется плавно */
.pill {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    align-self: flex-end;
    box-sizing: border-box;
    /* свёрнутая — ровно кнопка плюс отступы вокруг неё (размер контрола берём из контекста tao-size-large) */
    width: calc(var(--tao-control-height) + var(--tao-space-1) * 2);
    padding: var(--tao-space-1);
    overflow: hidden;
    border-radius: var(--tao-radius-full);
    /* свёрнутая — просто кнопка, без рамки и тени: подложка и тень проявляются при раскрытии */
    background: transparent;
    box-shadow: none;
    /* сворачиваясь: сначала сужается, потом гаснет подложка */
    transition: width 0.24s ease, background-color 0.12s ease 0.2s, box-shadow 0.12s ease 0.2s;
}

/* раскрываясь: подложка с тенью проявляется сразу, кнопка отзывается лёгким «пульсом», затем таблетка выезжает в сторону.
   Пульсирует именно кнопка, а не вся таблетка: таблетка прижата вправо и уже растёт, её увеличение сдвигало бы край */
.pill.open {
    width: 100%;
    background: var(--tao-color-surface-raised);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
    transition: width 0.24s ease 0.1s, background-color 0.08s ease, box-shadow 0.08s ease;
}

.pill.open .pill-button {
    animation: pill-pulse 0.18s ease-out;
}

@keyframes pill-pulse {
    50% {
        scale: 1.12;
    }
}

.pill-field {
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    padding-inline-start: 0;
    opacity: 0;
    transition: opacity 0.18s ease, padding 0.24s ease;
}

/* раскрываясь, поле ждёт, пока таблетка начнёт расти (та же задержка, что у ширины): иначе растущий отступ выдавливал кнопку вправо */
.pill.open .pill-field {
    padding-inline-start: var(--tao-space-3);
    opacity: 1;
    transition: opacity 0.18s ease 0.1s, padding 0.24s ease 0.1s;
}

.pill-field > :first-child {
    flex: 1;
    min-width: 0;
}

.pill-clear {
    flex: none;
    /* отступ от основной кнопки: иначе наведение на крестик «слипается» с ней */
    margin-inline-end: var(--tao-space-2);
    color: var(--tao-color-text-muted);
}

.pill-button {
    flex: none;
    border-radius: var(--tao-radius-full);
}

/* подсказка — ярлык под полем, справа: тот же фон, что у поля, чуть заходит под него и выглядит его частью */
.preview {
    position: relative;
    z-index: 0;
    display: flex;
    gap: var(--tao-space-2);
    align-items: center;
    align-self: flex-end;
    margin: calc(var(--tao-space-3) * -1) var(--tao-space-4) 0;
    padding: calc(var(--tao-space-3) + var(--tao-space-1)) var(--tao-space-3) var(--tao-space-1);
    border-radius: 0 0 var(--tao-radius-md) var(--tao-radius-md);
    background: var(--tao-color-surface-raised);
    box-shadow: 0 6px 16px rgb(0 0 0 / 0.22);
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

/* на телефоне подсказка — ярлык НАД таблеткой: снизу она поднимала бы поле и уводила взгляд; сверху поле стоит на месте (прижато к низу), а ярлык вырастает вверх */
.quick.phone .preview {
    order: -1;
    margin: 0 var(--tao-space-4) calc(var(--tao-space-3) * -1);
    padding: var(--tao-space-1) var(--tao-space-3) calc(var(--tao-space-3) + var(--tao-space-1));
    border-radius: var(--tao-radius-md) var(--tao-radius-md) 0 0;
    box-shadow: 0 -6px 16px rgb(0 0 0 / 0.22);
}

.field-wide {
    position: relative;
    z-index: 1;
}

@media (prefers-reduced-motion: reduce) {
    .pill,
    .pill-field {
        transition: none;
    }

    .pill.open .pill-button {
        animation: none;
    }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { TaoButton, TaoCheckbox, TaoIcon } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { formatUserDate } from '@/core/date';
import { daysLeft as calcDaysLeft, isArchived } from '@/core/lifecycle';
import { UNKNOWN_TIME } from '@/core/model';
import { extractTags } from '@/core/tags';
import { dateShort, formatDateTime, inDaysText, repeatText, useI18n } from '@/i18n';
import { useWide } from '@/ui/shell/useWide';
import MarkdownView from '@/ui/notes/MarkdownView.vue';
import { toggleTag } from '@/ui/notes/useNotes';
import { useEditor } from './useEditor';

/**
 * Заметка для чтения: текст отрисован как документ, его можно выделять и копировать, ссылки и теги нажимаются,
 * пункты отмечаются прямо здесь. Правка — кнопка «Изменить» или клавиша `E`.
 */
const emit = defineEmits<{ close: [] }>();

const { t, locale } = useI18n();
const store = useNotesStore();
const editor = useEditor();
// в панели справа (широкий экран) кнопки сверху и своя «Закрыть»; в окне (телефон, планшет) — внизу, а закрывает рамка окна
const wide = useWide();

const root = ref<HTMLElement | null>(null);
const sourceId = editor.state.value?.source?.id ?? '';
const note = computed(() => store.notes.find((n) => n.id === sourceId && n.deletedAt === null) ?? null);

// заметку удалили или убрала чистка, пока она открыта: закрываем
watch(note, (value) => {
    if (!value) emit('close');
});
onMounted(() => root.value?.focus({ preventScroll: true }));

// первая непустая строка — заголовок, остальное — текст
const parts = computed(() => {
    const lines = (note.value?.body ?? '').split('\n');
    const at = lines.findIndex((line) => line.trim() !== '');
    if (at < 0) return { title: '', rest: '' };
    return { title: lines[at]!.replace(/^\s*#{1,6}\s+/, ''), rest: lines.slice(at + 1).join('\n').trim() };
});

const left = computed(() => (note.value ? calcDaysLeft(note.value, store.today) : 0));
const archived = computed(() => (note.value ? isArchived(note.value, store.today) : false));
const dueText = computed(() => {
    if (!note.value) return '';
    if (archived.value) return formatUserDate(note.value.due);
    return left.value === 0 ? t('date.today') : inDaysText(left.value);
});
const dueDate = computed(() => (note.value && !archived.value && left.value > 0 ? dateShort(locale.value, note.value.due) : note.value && !archived.value ? dateShort(locale.value, note.value.due) : ''));
const repeatLabel = computed(() => (note.value?.repeat ? repeatText(note.value.repeat) : ''));
const tags = computed(() => [...new Set(extractTags(note.value?.body ?? '').map((tag) => tag.toLocaleLowerCase()))]);
const checkedCount = computed(() => note.value?.items.filter((item) => item.doneAt !== null).length ?? 0);

const times = computed(() => {
    const n = note.value;
    if (!n || n.createdAt <= UNKNOWN_TIME) return '';
    const created = formatDateTime(n.createdAt, locale.value);
    return n.updatedAt > n.createdAt ? t('read.createdChanged', [created, formatDateTime(n.updatedAt, locale.value)]) : t('read.created', [created]);
});
const itemTime = (doneAt: number | null): string => (doneAt && doneAt > UNKNOWN_TIME ? formatDateTime(doneAt, locale.value) : '');

const edit = (): void => {
    if (note.value) editor.openEdit(note.value);
};

// клик по тегу в тексте ищет по нему и возвращает к списку
function onTag(tag: string): void {
    toggleTag(tag);
    emit('close');
}
</script>

<template>
    <article v-if="note" ref="root" class="read" tabindex="-1" @keydown.esc="emit('close')">
        <!-- копия, удаление и завершение — в ленте (свайп, меню строки, кружок): способ завершить заметку один, здесь только чтение и правка -->
        <div v-if="wide" class="top">
            <TaoButton variant="secondary" icon="tao-edit" shortcut="E" @click="edit">{{ t('read.edit') }}</TaoButton>
            <TaoButton class="close" variant="secondary" tone="danger" icon="tao-close" :aria-label="t('ui.button.close')" :title="t('ui.button.close')" @click="emit('close')" />
        </div>

        <h1 class="title"><MarkdownView :text="parts.title || t('list.untitled')" @tag="onTag" /></h1>

        <div class="chips">
            <span class="chip">
                <b>{{ dueText }}</b>
                <span v-if="dueDate" class="muted">{{ dueDate }}</span>
            </span>
            <span v-if="repeatLabel" class="chip muted"><TaoIcon name="tao-repeat" />{{ repeatLabel }}</span>
            <button v-for="tag in tags" :key="tag" type="button" class="chip tag" @click="onTag(tag)">#{{ tag }}</button>
        </div>

        <MarkdownView v-if="parts.rest" class="body" :text="parts.rest" @tag="onTag" />

        <section v-if="note.items.length" class="items" :aria-label="t('editor.items.label')">
            <h2 class="caption">{{ t('read.items', [checkedCount, note.items.length]) }}</h2>
            <label v-for="item in note.items" :key="item.id" class="item" :class="{ done: item.doneAt !== null }">
                <TaoCheckbox :model-value="item.doneAt !== null" :aria-label="item.text" @update:model-value="store.toggleItem(note.id, item.id)" />
                <span class="item-text">{{ item.text }}</span>
                <span v-if="itemTime(item.doneAt)" class="item-time">{{ itemTime(item.doneAt) }}</span>
            </label>
        </section>

        <p v-if="times" class="times">{{ times }}</p>

        <div v-if="!wide" class="bottom">
            <TaoButton variant="ghost" class="neutral" icon="tao-edit" block @click="edit">{{ t('read.edit') }}</TaoButton>
            <!-- «Закрыть» под правым большим пальцем: тянуться к крестику вверху неудобно, а читают и закрывают чаще всего -->
            <TaoButton variant="secondary" icon="tao-close" block @click="emit('close')">{{ t('ui.button.close') }}</TaoButton>
        </div>
    </article>
</template>

<style scoped>
.read {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
    min-height: 100%;
    outline: none;
}

.top {
    display: flex;
    gap: var(--tao-space-2);
    align-items: center;
    justify-content: space-between;
}

/* «Изменить» — без рамки, но в нейтральном цвете: акцентный ghost здесь спорил бы с остальным окном */
.bottom .neutral {
    color: var(--tao-color-text);
}

.close {
    margin-inline-start: auto;
}

.title {
    margin: var(--tao-space-2) 0 0;
    font-size: var(--tao-font-size-2xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.3;
}

.title :deep(.markdown),
.title :deep(p) {
    margin: 0;
    font: inherit;
}

.chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
}

.chip {
    display: inline-flex;
    gap: var(--tao-space-2);
    align-items: center;
    height: 2rem;
    padding-inline: var(--tao-space-3);
    border: 1px solid var(--tao-color-border);
    border-radius: var(--tao-radius-full);
    background: transparent;
    color: var(--tao-color-text);
    font: inherit;
    font-size: var(--tao-font-size-sm);
}

.chip b {
    font-weight: 700;
}

.muted {
    color: var(--tao-color-text-muted);
}

.tag {
    cursor: pointer;
}

.tag:hover {
    background: var(--tao-color-surface-hover);
}

/* текст читается и копируется: никаких обработчиков клика на самом документе */
.read .body {
    font-size: var(--tao-font-size-lg);
    line-height: 1.65;
    user-select: text;
}

.items {
    display: flex;
    flex-direction: column;
}

.caption {
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
    font-weight: 500;
}

.item {
    display: flex;
    gap: var(--tao-space-2);
    align-items: center;
    min-height: 44px;
    cursor: pointer;
}

.item.done .item-text {
    color: var(--tao-color-text-muted);
    text-decoration: line-through;
}

.item-text {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
}

.item-time {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

.times {
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

/* на телефоне главные действия внизу, у большого пальца, и остаются на виду при прокрутке */
.bottom {
    position: sticky;
    bottom: 0;
    z-index: 1;
    display: flex;
    gap: var(--tao-space-2);
    margin-top: auto;
    padding-block: var(--tao-space-3);
    border-top: 1px solid var(--tao-color-border);
    background: var(--nu-foot-bg, var(--tao-color-bg)) var(--nu-foot-grain, none);
}
</style>

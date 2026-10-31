<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoContextMenu, TaoDropdownMenu, TaoIcon, type TaoMenuItem } from '@1337exp/taoui';
import { formatUserDate, type IsoDate } from '@/core/date';
import { daysLeft as calcDaysLeft, isArchived } from '@/core/lifecycle';
import type { Note } from '@/core/model';
import { rowTitle } from '@/core/notes';
import { extractTags } from '@/core/tags';
import { dateShort, inDaysText, repeatText, useI18n } from '@/i18n';
import { TaoxSwipeRow, type SwipeRowAction } from '@1337exp/taoux/swiperow';
import { useSettingsStore } from '@/app/settings';

const props = defineProps<{
    note: Note;
    today: IsoDate;
    /** Открыта в редакторе. */
    selected?: boolean;
    /** Единственная остановка `Tab` на весь список: остальные строки берутся стрелками. */
    tabStop?: boolean;
}>();

const emit = defineEmits<{
    /** Открыть для чтения (клик, Enter). */
    open: [note: Note];
    edit: [note: Note];
    clone: [note: Note];
    done: [note: Note];
    reopen: [note: Note];
    remove: [note: Note];
}>();

const { t, locale } = useI18n();
const { settings } = useSettingsStore();

const left = computed(() => calcDaysLeft(props.note, props.today));
const archived = computed(() => isArchived(props.note, props.today));
const done = computed(() => props.note.doneAt !== null);

const title = computed(() => rowTitle(props.note) || t('list.untitled'));
const tags = computed(() => [...new Set(extractTags(props.note.body).map((tag) => tag.toLocaleLowerCase()))].slice(0, 3));
// счётчик целей: «Цели: 0 из 1» первой строкой под заголовком (прогресс заметки), а полная подпись — для скринридера и подсказки
const checkedCounts = computed(() => {
    const items = props.note.items;
    return items.length ? [items.filter((item) => item.doneAt !== null).length, items.length] : null;
});
const checked = computed(() => (checkedCounts.value ? t('list.checked', checkedCounts.value) : ''));
const checkedLabel = computed(() => (checkedCounts.value ? t('list.checkedLabel', checkedCounts.value) : ''));
const repeatLabel = computed(() => (props.note.repeat ? repeatText(props.note.repeat) : ''));

// сколько осталось — словами, чтобы не считать в уме; для «сегодня» подпись не нужна: так названа группа
const when = computed(() => (!archived.value && left.value > 0 ? inDaysText(left.value) : ''));
const dateText = computed(() => (archived.value ? formatUserDate(props.note.due) : left.value > 0 ? dateShort(locale.value, props.note.due) : ''));

// кружок: у активной завершает, у завершённой до срока возвращает; у просроченной уже ничего не сделать
const canToggle = computed(() => !archived.value || (done.value && left.value >= 0));
// в архиве заметка без отметки — не «невыполненная задача», а просто прошедшая: срок вышел, отметить её уже нельзя
const expired = computed(() => archived.value && !done.value);
const checkLabel = computed(() => (expired.value ? t('list.expired') : done.value ? t('list.markUndone') : t('list.markDone')));

function onToggle(): void {
    if (done.value) emit('reopen', props.note);
    else emit('done', props.note);
}

const menu = computed<TaoMenuItem[]>(() => [
    { id: 'edit', label: t('ui.button.change'), icon: 'tao-edit' },
    { id: 'clone', label: t('ui.button.clone'), icon: 'tao-copy' },
    archived.value && left.value >= 0
        ? { id: 'reopen', label: t('ui.button.reopen'), icon: 'tao-undo' }
        : { id: 'done', label: t('ui.button.done'), icon: 'tao-check', disabled: archived.value },
    { type: 'separator' },
    { id: 'remove', label: t('ui.button.delete'), icon: 'tao-trash' },
]);

// клик по строке открывает редактор, но не по её собственным кнопкам
function onRowClick(event: MouseEvent): void {
    if ((event.target as Element).closest('a, button, input, label, [role="menu"]')) return;
    emit('open', props.note);
}

// свайп (TaoUX): вправо — завершить (в архиве — вернуть в работу), влево — копия, удаление, правка.
// «Удалить» стоит не последним, чтобы длинный свайп запускал безобидное «Изменить», а не удаление
const swipeOpen = ref(false);

const startAction = computed<SwipeRowAction | undefined>(() => {
    if (!archived.value) return { id: 'done', label: t('read.done'), icon: 'tao-check', tone: 'success' };
    if (done.value && left.value >= 0) return { id: 'reopen', label: t('ui.button.reopen'), icon: 'tao-undo', tone: 'info' };
    return undefined;
});
const endActions = computed<SwipeRowAction[]>(() => [
    { id: 'clone', label: t('read.swipeCopy'), icon: 'tao-copy', tone: 'neutral' },
    { id: 'remove', label: t('ui.button.delete'), icon: 'tao-trash', tone: 'danger' },
    { id: 'edit', label: t('ui.button.change'), icon: 'tao-edit', tone: 'accent' },
]);

function onMenu(id: string): void {
    swipeOpen.value = false;
    if (id === 'edit') emit('edit', props.note);
    else if (id === 'clone') emit('clone', props.note);
    else if (id === 'done') emit('done', props.note);
    else if (id === 'reopen') emit('reopen', props.note);
    else if (id === 'remove') emit('remove', props.note);
}
</script>

<template>
    <TaoContextMenu :items="menu" :menu-label="t('list.menu')" @select="onMenu">
        <TaoxSwipeRow v-model:open="swipeOpen" class="swipe-row" :tabbable="false" :start="startAction" :end="endActions" :full-swipe="settings.fullSwipe" @action="onMenu">
            <div class="row" :class="{ selected, done }" :data-note-id="note.id" :tabindex="tabStop ? 0 : -1" role="article" :aria-current="selected ? 'true' : undefined" @click="onRowClick" @keydown.enter.self="emit('open', note)" @keydown.space.self.prevent="canToggle && onToggle()" @keydown.delete.self="emit('remove', note)">
                <span class="hit">
                    <button type="button" class="check" :class="{ expired }" tabindex="-1" :disabled="!canToggle" :aria-label="checkLabel" :title="expired ? checkLabel : undefined" :aria-pressed="expired ? undefined : done" @click.stop="onToggle">
                        <TaoIcon v-if="done" name="tao-check" class="check-icon" />
                        <TaoIcon v-else-if="expired" name="tao-calendar" class="check-icon" />
                        <!-- подсказка при наведении: в пустом кружке проступает галочка (на сенсорных экранах её нет) -->
                        <TaoIcon v-else name="tao-check" class="check-icon check-hint" />
                    </button>
                </span>

                <div class="body">
                    <div class="main">
                        <div class="title">{{ title }}</div>
                        <div v-if="checked || repeatLabel || tags.length" class="meta">
                            <span v-if="checked" :title="checkedLabel" :aria-label="checkedLabel" role="img">{{ checked }}</span>
                            <span v-if="repeatLabel" class="repeat"><TaoIcon name="tao-repeat" />{{ repeatLabel }}</span>
                            <!-- теги в ленте — только текст: у строки и так тап, свайп и меню; поиск по тегу — чипы над списком -->
                            <span v-for="tag in tags" :key="tag">#{{ tag }}</span>
                        </div>
                    </div>

                    <div v-if="when || dateText" class="when">
                        <div v-if="when" class="in-days">{{ when }}</div>
                        <div class="date">{{ dateText }}</div>
                    </div>
                    <TaoDropdownMenu :items="menu" :menu-label="t('list.menu')" class="more" size="small" :tabbable="false" @select="onMenu" />
                </div>
            </div>
        </TaoxSwipeRow>
    </TaoContextMenu>
</template>

<style scoped>
/* строка лежит прямо на странице: фон и скругление свайпа подгоняем под неё, иначе по углам видна «рамка» */
.swipe-row {
    --tx-swipe-bg: var(--tao-color-bg);
    --tx-swipe-radius: var(--tao-radius-lg);
}

.row {
    /* на сенсорных экранах браузер заливает строку синим при тапе (в том числе по кнопке меню): у нас своё состояние наведения */
    -webkit-tap-highlight-color: transparent;
    display: flex;
    align-items: flex-start;
    padding-inline-start: var(--tao-space-1);
    border-radius: var(--tao-radius-lg);
    /* непрозрачный: под строкой лежит панель свайпа, она не должна просвечивать */
    background: var(--tao-color-bg);
    cursor: pointer;
}

/* наведение — лёгкая подсветка (45%) поверх сплошной основы: основа нужна, чтобы панель свайпа не просвечивала */
.row:hover {
    background-image: linear-gradient(color-mix(in srgb, var(--tao-color-surface-hover) 45%, transparent), color-mix(in srgb, var(--tao-color-surface-hover) 45%, transparent));
}

.row.selected {
    background: var(--tao-color-surface-raised);
}

.row.selected .body {
    border-bottom-color: transparent;
}

/* карточку можно открыть с клавиатуры (Enter): кольцо видно только при навигации клавишами */
.row:focus-visible {
    outline: 2px solid var(--tao-color-accent);
    outline-offset: -2px;
}

/* зона касания 44 px при кружке 24: попасть пальцем легко, не делая кружок громоздким */
.hit {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: var(--nu-row-min);
}

.check {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    width: 24px;
    height: 24px;
    padding: 0;
    /* тихое кольцо: тонкое и полупрозрачное (35% цвета приглушённого текста), чтобы кружки не перетягивали взгляд; при наведении подсвечивается акцентом */
    border: 1px solid color-mix(in srgb, var(--tao-color-text-muted) 35%, transparent);
    border-radius: 50%;
    background: transparent;
    color: var(--tao-color-text-muted);
    cursor: pointer;
    transition: border-color 0.12s ease;
}

.check-hint {
    opacity: 0;
    /* галочка в цвет подсветки кружка; при наведении проявляется и плавно «жирнеет» (линия толще, чем атрибут SVG 2 → 2.6) */
    color: var(--tao-color-accent);
    transition: opacity 0.14s ease;
}

.check-hint :deep(svg) {
    stroke-width: 1.5;
    transition: stroke-width 0.22s ease;
}

@media (hover: hover) {
    /* наведение: яркая подсветка акцентом (как раньше) и галочка в кружке */
    .hit:hover .check:not(:disabled) {
        border-color: var(--tao-color-accent);
        background: var(--tao-color-accent-subtle);
    }

    .hit:hover .check:not(:disabled) .check-hint {
        opacity: 1;
    }

    .hit:hover .check:not(:disabled) .check-hint :deep(svg) {
        stroke-width: 2.6;
    }
}

.check:focus-visible {
    outline: 2px solid var(--tao-color-accent);
    outline-offset: 2px;
}

.check:disabled {
    cursor: default;
}

.check.expired {
    border-color: transparent;
    background: transparent;
}

.done .check {
    border-color: var(--tao-color-border);
    background: var(--tao-color-surface-raised);
}

.check-icon {
    font-size: 0.8rem;
}

/* строки разделены тонкой линией (как в макете A4); у выбранной строки линии нет */
.body {
    border-bottom: 1px solid var(--tao-color-border);
    box-sizing: border-box;
    display: flex;
    flex: 1;
    gap: var(--tao-space-3);
    align-items: center;
    /* у всех строк одна минимальная высота: у «Сегодня» нет блока «через N дней», и без неё они слипались бы */
    min-height: var(--nu-row-min);
    min-width: 0;
    padding-block: var(--tao-space-2);
    padding-inline-end: var(--tao-space-1);
}

.main {
    flex: 1;
    min-width: 0;
}

.title {
    display: -webkit-box;
    overflow: hidden;
    font-size: var(--tao-font-size-lg);
    font-weight: 500;
    line-height: 1.4;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
}

.done .title {
    color: var(--tao-color-text-muted);
    text-decoration: line-through;
}

.meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2px var(--tao-space-3);
    margin-top: 2px;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

.repeat {
    display: inline-flex;
    gap: 4px;
    align-items: center;
}

.when {
    flex: none;
    text-align: end;
    white-space: nowrap;
}

.in-days {
    font-size: var(--tao-font-size-sm);
    font-weight: 500;
    line-height: 1.5;
}

.date {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
    line-height: 1.5;
}

.more {
    flex: none;
    margin-block: -4px;
}

/* мышью меню появляется при наведении или фокусе; на сенсорном экране есть свайп и долгое нажатие */
@media (hover: hover) {
    .more {
        opacity: 0;
    }

    .row:hover .more,
    .row:focus-within .more {
        opacity: 1;
    }
}

</style>

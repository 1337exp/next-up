<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton, TaoCard, TaoChecklist, TaoContextMenu, TaoCopy, TaoDropdownMenu, TaoIcon, TaoTag, type TaoMenuItem } from '@1337exp/taoui';
import { formatUserDate, type IsoDate } from '@/core/date';
import { daysLeft as calcDaysLeft, isArchived, isFar, urgency } from '@/core/lifecycle';
import { UNKNOWN_TIME, type Note } from '@/core/model';
import { formatDateTime, repeatText, useI18n, weekdayShort } from '@/i18n';
import SwipeRow from '@/ui/components/SwipeRow.vue';
import MarkdownView from './MarkdownView.vue';

const props = defineProps<{
    note: Note;
    today: IsoDate;
    /** Сворачивать содержимое заметок дальше FAR_DAYS дней (настройка). */
    hideFar?: boolean;
    /** Открыта в редакторе. */
    selected?: boolean;
}>();

const emit = defineEmits<{
    edit: [note: Note];
    clone: [note: Note];
    done: [note: Note];
    reopen: [note: Note];
    remove: [note: Note];
    toggleItem: [note: Note, itemId: string];
    /** Клик по хештегу в тексте: `работа` (без `#`). */
    tag: [tag: string];
}>();

const { t, locale } = useI18n();

const left = computed(() => calcDaysLeft(props.note, props.today));
const level = computed(() => urgency(left.value));
// цвет не единственный носитель смысла: срок написан словами в бейдже
const tone = computed(() => ({ past: 'neutral', today: 'success', soon: 'warning', later: 'neutral' })[level.value] as 'neutral' | 'success' | 'warning');
const archived = computed(() => isArchived(props.note, props.today));
const stripe = computed(() => (!archived.value && (level.value === 'today' || level.value === 'soon') ? 'left' : undefined));

const dateText = computed(() => formatUserDate(props.note.due));

const repeatLabel = computed(() => (props.note.repeat ? repeatText(props.note.repeat) : ''));

const canCollapse = computed(() => !!props.hideFar && isFar(left.value));
const showMore = ref(false);
const expanded = computed(() => !canCollapse.value || showMore.value);

const menu = computed<TaoMenuItem[]>(() => [
    { id: 'edit', label: t('ui.button.change'), icon: 'tao-edit' },
    { id: 'clone', label: t('ui.button.clone'), icon: 'tao-copy' },
    archived.value && left.value >= 0
        ? { id: 'reopen', label: t('ui.button.reopen'), icon: 'tao-undo' }
        : { id: 'done', label: t('ui.button.done'), icon: 'tao-check', disabled: archived.value },
    { type: 'separator' },
    { id: 'remove', label: t('ui.button.delete'), icon: 'tao-trash' },
]);

// клик по карточке открывает редактор, но не по её собственным элементам (кнопки, ссылки, пункты списка, теги)
function onCardClick(event: MouseEvent): void {
    if ((event.target as Element).closest('a, button, input, label, [role="menu"], .tao-checklist')) return;
    emit('edit', props.note);
}

// свайп влево на сенсорном экране открывает самые частые действия; правка — касанием, остальное — в меню
const swipeOpen = ref(false);
const SWIPE_WIDTH = 64;
const swipeActions = computed(() => {
    const list: { id: string; label: string; icon: string }[] = [];
    if (!archived.value) list.push({ id: 'done', label: t('ui.button.done'), icon: 'tao-check' });
    else if (left.value >= 0) list.push({ id: 'reopen', label: t('ui.button.reopen'), icon: 'tao-undo' });
    list.push({ id: 'remove', label: t('ui.button.delete'), icon: 'tao-trash' });
    return list;
});

function onMenu(id: string): void {
    swipeOpen.value = false;
    if (id === 'edit') emit('edit', props.note);
    else if (id === 'clone') emit('clone', props.note);
    else if (id === 'done') emit('done', props.note);
    else if (id === 'reopen') emit('reopen', props.note);
    else if (id === 'remove') emit('remove', props.note);
}

// TaoChecklist отдаёт новый набор отмеченных; ищем, какой пункт переключили
const doneIds = computed(() => props.note.items.filter((item) => item.doneAt !== null).map((item) => item.id));
const checklistItems = computed(() => props.note.items.map((item) => ({ value: item.id, label: item.text })));

function onChecked(values: (string | number)[]): void {
    const before = new Set(doneIds.value);
    const after = new Set(values.map(String));
    const changed = [...after].find((id) => !before.has(id)) ?? [...before].find((id) => !after.has(id));
    if (changed) emit('toggleItem', props.note, changed);
}

function timeOf(itemId: string): string {
    const doneAt = props.note.items.find((item) => item.id === itemId)?.doneAt;
    return doneAt && doneAt > UNKNOWN_TIME ? formatDateTime(doneAt, locale.value) : '';
}
</script>

<template>
    <TaoContextMenu :items="menu" :menu-label="t('list.menu')" @select="onMenu">
        <SwipeRow v-model:open="swipeOpen" :width="SWIPE_WIDTH" :disabled="swipeActions.length === 0">
        <TaoCard class="note" :stripe="stripe" :stripe-tone="tone" :active="selected" :data-note-id="note.id" :shadow="false" surface="grain" @click="onCardClick">
            <div class="content">
                <header class="header">
                    <div class="meta">
                        <TaoTag v-if="left >= 0" :tone="tone" size="small">{{ left === 0 ? t('date.today') : t('date.daysLeft', [left]) }}</TaoTag>
                        <TaoTag tone="neutral" size="small">{{ weekdayShort(locale, note.due) }}</TaoTag>
                        <span class="date-line">
                            <TaoCopy :text="dateText" tip :success-message="t('ui.copied')" :copy-label="t('ui.copy')">
                                <template #default="{ copy }">
                                    <button type="button" class="date" :title="t('ui.copy')" @click="() => copy()">{{ dateText }}</button>
                                </template>
                            </TaoCopy>
                            <template v-if="repeatLabel"> · <TaoIcon name="tao-repeat" class="repeat-icon" /> {{ repeatLabel }}</template>
                        </span>
                    </div>

                    <div class="actions">
                        <TaoButton v-if="canCollapse" variant="text" :icon="expanded ? 'tao-eye-off' : 'tao-eye'" :aria-label="expanded ? t('list.collapse') : t('list.expand')" @click="showMore = !showMore" />
                        <TaoDropdownMenu :items="menu" :menu-label="t('list.menu')" @select="onMenu" />
                    </div>
                </header>

                <MarkdownView v-if="expanded && note.body" :text="note.body" @tag="emit('tag', $event)" />

                <TaoChecklist v-if="expanded && note.items.length" :items="checklistItems" :model-value="doneIds" strike @update:model-value="onChecked">
                    <template #item="{ item }">
                        <span class="item-text">{{ item.label }}</span>
                        <span v-if="timeOf(String(item.value))" class="item-time">{{ timeOf(String(item.value)) }}</span>
                    </template>
                </TaoChecklist>
            </div>
        </TaoCard>
            <template #actions>
                <button v-for="action in swipeActions" :key="action.id" type="button" class="swipe-button" :class="{ 'swipe-button--danger': action.id === 'remove' }" :aria-label="action.label" @click="onMenu(action.id)">
                    <TaoIcon :name="action.icon" />
                </button>
            </template>
        </SwipeRow>
    </TaoContextMenu>
</template>

<style scoped>
.note {
    cursor: pointer;
}

.swipe-button {
    flex: 1 1 0;
    min-height: 0;
    border: 0;
    border-top: 1px solid var(--tao-color-border);
    background: transparent;
    color: var(--tao-color-success);
    font: inherit;
    font-size: var(--tao-font-size-xl);
    cursor: pointer;
}

.swipe-button:first-child {
    border-top: 0;
}

.swipe-button--danger {
    color: var(--tao-color-danger);
}

.content {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--tao-space-2);
}

.meta {
    display: flex;
    flex-wrap: wrap;
    /* по базовой линии, а не по центру: бейдж (строка 15 px в боксе 18 px) и дата (строка 18 px) при выравнивании
       по центру ставили текст на 0.5 px по-разному, и в зависимости от дробной позиции карточки это было видно */
    align-items: baseline;
    gap: var(--tao-space-2);
    min-width: 0;
}

.date-line {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

.date {
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
}

.actions {
    display: flex;
    align-items: center;
}

.item-time {
    margin-left: var(--tao-space-2);
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}
</style>

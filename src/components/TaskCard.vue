<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton, TaoCard, TaoCopy, TaoDropdownMenu, TaoIcon, TaoTag, type TaoDropdownAction } from '@1337exp/taoui';
import MarkdownText from '@/components/MarkdownText.vue';
import SwipeReveal from '@/components/SwipeReveal.vue';
import TaskChecklist from '@/components/TaskChecklist.vue';
import { formatUserDate, type IsoDate } from '@/domain/date';
import { daysLeft as calcDaysLeft, isFarTask, urgency } from '@/domain/lifecycle';
import type { Task } from '@/domain/types';
import { useI18n, weekdayShort } from '@/i18n';

const props = defineProps<{
    task: Task;
    today: IsoDate;
    /** Сворачивать содержимое задач дальше 21 дня (настройка). */
    hideFar?: boolean;
    /** Показывать «Изменить» и «Клонировать». */
    canEdit?: boolean;
    /** Просить подтверждение при снятии отметки с пункта списка (настройка). */
    confirmUncheck?: boolean;
    /** Общий масштаб интерфейса (1 = 100%): панель свайпа считает размеры в px. */
    uiScale?: number;
}>();

const emit = defineEmits<{
    done: [task: Task];
    reopen: [task: Task];
    edit: [task: Task];
    clone: [task: Task];
    remove: [task: Task];
    toggleItem: [task: Task, index: number];
    /** Клик по хештегу в заметке: `#работа`. */
    tag: [tag: string];
}>();

const TONES = { past: 'neutral', today: 'success', soon: 'danger', later: 'neutral' } as const;

const { t, locale } = useI18n();

const left = computed(() => calcDaysLeft(props.task, props.today));
const tone = computed(() => TONES[urgency(left.value)]);
const dateText = computed(() => formatUserDate(props.task.date));

const repeatLabel = computed(() => (props.task.recurrence === 'none' ? '' : t(`tasks.form.repeat.${props.task.recurrence}`)));

// содержимое можно свернуть, если включена настройка и срок дальше 21 дня
const canCollapse = computed(() => !!props.hideFar && isFarTask(left.value));
const showMore = ref(false);
const expanded = computed(() => !canCollapse.value || showMore.value);

// в архиве: срок прошёл или завершена; вернуть в работу можно, пока срок не прошёл
const inArchive = computed(() => props.task.done || left.value < 0);

const actions = computed<TaoDropdownAction[]>(() => {
    const list: TaoDropdownAction[] = [];
    if (!inArchive.value) list.push({ id: 'done', ico: 'ok', name: t('ui.button.done') });
    else if (left.value >= 0) list.push({ id: 'reopen', ico: 'logout', name: t('ui.button.inProgress') });
    if (props.canEdit) {
        list.push({ id: 'edit', ico: 'pencil', name: t('ui.button.change') });
        list.push({ id: 'clone', ico: 'docs', name: t('ui.button.clone') });
    }
    list.push({ id: 'remove', ico: 'trash-1', name: t('ui.button.delete') });
    return list;
});

// свайп влево на сенсорном экране открывает два самых частых действия: «Изменить» сверху, «Завершить» снизу.
// Опасное «Удалить» и редкое «Клонировать» остаются в меню: случайно задеть их на телефоне труднее.
const swipeOpen = ref(false);
const SWIPE_BUTTON_PX = 44;
const scale = computed(() => props.uiScale ?? 1);
const SWIPE_ORDER = ['edit', 'done', 'reopen'];
const swipeActions = computed(() => SWIPE_ORDER.map((id) => actions.value.find((action) => action.id === id)).filter((action): action is TaoDropdownAction => !!action));

function onSwipeAction(id: string): void {
    swipeOpen.value = false;
    onAction(id);
}

function onAction(id: string): void {
    switch (id) {
        case 'done': emit('done', props.task); break;
        case 'reopen': emit('reopen', props.task); break;
        case 'edit': emit('edit', props.task); break;
        case 'clone': emit('clone', props.task); break;
        case 'remove': emit('remove', props.task); break;
    }
}
</script>

<template>
    <SwipeReveal
        v-model:open="swipeOpen"
        :width="64 * scale"
        :overlap="10 * scale"
        :max-height="100 * scale"
        :open-min-height="swipeActions.length * SWIPE_BUTTON_PX * scale"
        :disabled="swipeActions.length === 0"
    >
        <TaoCard class="task" :shadow="false" :data-task-id="task.id">
        <!-- три части с общим отступом: заголовок, тело (заметка), подвал (чек-лист) -->
        <div class="content">
            <header class="header">
                <div class="meta">
                    <TaoTag v-if="left >= 0" class="tag" :type="tone">
                        {{ left === 0 ? t('tasks.date.today') : t('tasks.date.daysLeft', [left]) }}
                    </TaoTag>
                    <TaoTag class="tag" type="neutral">{{ weekdayShort(locale, task.date) }}</TaoTag>
                    <span class="date-line">
                        <!-- копирование по клику на саму дату, без отдельной иконки -->
                        <TaoCopy :text="dateText" tip :success-message="t('ui.copied')" :copy-label="t('ui.copy')">
                            <template #default="{ copy }">
                                <button type="button" class="date" :title="t('ui.copy')" @click="() => copy()">{{ dateText }}</button>
                            </template>
                        </TaoCopy>
                        <template v-if="repeatLabel"> / {{ repeatLabel }}</template>
                    </span>
                </div>

                <div class="actions">
                    <TaoButton
                        v-if="canCollapse"
                        variant="text"
                        :aria-label="expanded ? t('tasks.collapse') : t('tasks.expand')"
                        @click="showMore = !showMore"
                    >
                        <TaoIcon :name="expanded ? 'eye-off' : 'eye'" />
                    </TaoButton>
                    <TaoDropdownMenu :actions="actions" :menu-label="t('tasks.menu')" @selected="onAction">
                        <template #item="{ id, ico, text }">
                            <span class="menu-item" :class="{ 'menu-item--danger': id === 'remove' }">
                                <TaoIcon v-if="ico" :name="ico" class="menu-icon" />
                                {{ text }}
                            </span>
                        </template>
                    </TaoDropdownMenu>
                </div>
            </header>

            <div v-if="expanded && task.note" class="body">
                <MarkdownText class="note" :text="task.note" @tag="emit('tag', $event)" />
            </div>

            <footer v-if="expanded && task.checklist.length" class="footer">
                <TaskChecklist :items="task.checklist" :confirm-uncheck="confirmUncheck" @toggle="(index) => emit('toggleItem', task, index)" />
            </footer>
        </div>
        </TaoCard>

        <template #actions>
            <button
                v-for="action in swipeActions"
                :key="action.id"
                type="button"
                class="swipe-button"
                :class="{ 'swipe-button--success': action.id !== 'edit' }"
                :aria-label="action.name"
                :title="action.name"
                @click="onSwipeAction(action.id)"
            >
                <TaoIcon :name="action.ico ?? 'ok'" />
            </button>
        </template>
    </SwipeReveal>
</template>

<style scoped>
.menu-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.menu-icon {
    width: 1.2em;
    text-align: center;
}

.menu-item--danger {
    color: var(--tao-color-danger);
}

.swipe-button {
    flex: 1 1 0;
    min-height: 0;
    border: 0;
    border-top: 1px solid var(--tao-color-border);
    background: transparent;
    color: var(--tao-color-text);
    font: inherit;
    font-size: var(--tao-font-size-xl);
    font-weight: 600;
    cursor: pointer;
}

.swipe-button:first-child {
    border-top: 0;
}

.swipe-button--success {
    color: var(--tao-color-success);
}

.task {
    --nextup-card-gap: 20px;

    border: 1px solid var(--tao-color-border);
    background: var(--nextup-bg-card);
}

/* gap работает только на прямых потомках: поэтому заголовок, тело и подвал лежат в одном контейнере */
.content {
    display: flex;
    flex-direction: column;
    gap: var(--nextup-card-gap);
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--tao-space-2, 8px);
    font-size: calc(var(--tao-font-size-xs) * var(--nextup-header-scale, 1));
}

.meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px;
}

.tag {
    padding: 2px 5px;
}

/* у бейджа свой размер шрифта в теме, поэтому селектор длиннее простого .tag */
.meta .tag {
    font-size: calc(var(--tao-font-size-xs) * var(--nextup-header-scale, 1));
}

.date-line {
    font-size: calc(11px * var(--nextup-header-scale, 1) * var(--nextup-ui-scale, 1));
    color: var(--tao-color-text-muted);
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

.body {
    font-size: calc(var(--tao-font-size-sm) * var(--nextup-note-scale, 1));
}
</style>

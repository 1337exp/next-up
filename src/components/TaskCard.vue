<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton, TaoCard, TaoCopy, TaoDropdownMenu, TaoIcon, TaoTag, type TaoDropdownAction } from '@1337exp/taoui';
import MarkdownText from '@/components/MarkdownText.vue';
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
    /** Показывать «Изменить» и «Клонировать» (форма появится на этапе 4). */
    canEdit?: boolean;
}>();

const emit = defineEmits<{
    done: [task: Task];
    reopen: [task: Task];
    edit: [task: Task];
    clone: [task: Task];
    remove: [task: Task];
    toggleItem: [task: Task, index: number];
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
    if (!inArchive.value) list.push({ id: 'done', ico: 'login', name: t('ui.button.done') });
    else if (left.value >= 0) list.push({ id: 'reopen', ico: 'logout', name: t('ui.button.inProgress') });
    if (props.canEdit) {
        list.push({ id: 'edit', ico: 'pencil', name: t('ui.button.change') });
        list.push({ id: 'clone', ico: 'docs', name: t('ui.button.clone') });
    }
    list.push({ id: 'remove', ico: 'trash-1', name: t('ui.button.delete') });
    return list;
});

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
                    <TaoDropdownMenu :actions="actions" :menu-label="t('tasks.menu')" @selected="onAction" />
                </div>
            </header>

            <div v-if="expanded && task.note" class="body">
                <MarkdownText class="note" :text="task.note" />
            </div>

            <footer v-if="expanded && task.checklist.length" class="footer">
                <TaskChecklist :items="task.checklist" @toggle="(index) => emit('toggleItem', task, index)" />
            </footer>
        </div>
    </TaoCard>
</template>

<style scoped>
.task {
    --nextup-card-gap: 20px;

    border: 1px solid var(--tao-color-border);
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
    font-size: var(--tao-font-size-xs);
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

.date-line {
    font-size: 11px;
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
    font-size: var(--tao-font-size-sm);
}
</style>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { confirm, TaoButton, TaoCard, TaoCheckbox, TaoDivider, TaoEmpty, TaoIcon, TaoInput, TaoTabs, toast } from '@1337exp/taoui';
import SettingsDrawer from '@/components/SettingsDrawer.vue';
import TaskCard from '@/components/TaskCard.vue';
import TaskForm, { type TaskFormMode } from '@/components/TaskForm.vue';
import { isoParts } from '@/domain/date';
import { groupByMonth, isArchived } from '@/domain/lifecycle';
import { useCollapseHooks } from '@/lib/collapse';
import { filterByQuery, isSearchable, normalizeForSearch } from '@/domain/search';
import { taskTitle } from '@/domain/tasks';
import type { Task } from '@/domain/types';
import { monthName, useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import { useTasksStore } from '@/stores/tasks';

type ListTab = 'active' | 'archive';

const { t, locale } = useI18n();
const settings = useSettingsStore();
const tasks = useTasksStore();

const settingsOpen = ref(false);

// форма: одно окно на три режима
const formOpen = ref(false);
const formMode = ref<TaskFormMode>('create');
const formTask = ref<Task | null>(null);

function openForm(mode: TaskFormMode, task: Task | null = null): void {
    formMode.value = mode;
    formTask.value = task;
    formOpen.value = true;
}

// после сохранения показываем ту вкладку, где оказалась задача (задача с прошедшей датой сразу попадает в архив)
function onSaved(task: Task): void {
    const target: ListTab = isArchived(task, tasks.today) ? 'archive' : 'active';
    // вкладка не меняется: новая или изменённая карточка плавно раскрывается; со сменой вкладки список заменяется целиком
    if (target === tab.value) withLeaveAnimation(() => undefined);
    tab.value = target;
}
const tab = ref<ListTab>('active');

// быстрый поиск по заметкам, пунктам списка и дате; счётчики на вкладках показывают найденное
const query = ref('');
const exact = ref(false);
const searching = computed(() => isSearchable(query.value));
const found = computed(() => ({
    active: filterByQuery(tasks.active, query.value, { exact: exact.value }),
    archive: filterByQuery(tasks.archive, query.value, { exact: exact.value }),
}));

// счётчик выводится отдельным бейджем (слот label), а не текстом в скобках: так вкладки влезают в 360 px
const tabs = computed(() => [
    { value: 'active', label: t('tasks.tabs.active') },
    { value: 'archive', label: t('tasks.tabs.archive') },
]);
const counts = computed<Record<string, number>>(() => ({ active: found.value.active.length, archive: found.value.archive.length }));

const visible = computed(() => found.value[tab.value]);
const emptyText = computed(() => (searching.value ? t('tasks.search.empty') : t('tasks.empty')));

// разделитель: «К4 / Октябрь»; год добавляем, если он не текущий (иначе два января подряд не различить)
const groups = computed(() =>
    groupByMonth(visible.value).map((group) => {
        const sameYear = group.year === isoParts(tasks.today).year;
        const label = `${t('tasks.date.quarterTag')}${group.quarter} / ${monthName(locale.value, group.month)}`;
        return { ...group, label: sameYear ? label : `${label} ${group.year}` };
    }),
);

function onTabChange(key: string): void {
    if (key === 'active' || key === 'archive') tab.value = key;
}

// Уход карточки анимируем, только когда задачу убрали действием (удалили, завершили, вернули в работу).
// При смене вкладки и вводе в поиск список меняется целиком: там карточки должны заменяться сразу, без «вылета».
const animateLeave = ref(false);

const collapse = useCollapseHooks(() => animateLeave.value);
function withLeaveAnimation(action: () => void): void {
    animateLeave.value = true;
    action();
    // имя перехода читается при обновлении списка, поэтому выключаем после него
    void nextTick(() => setTimeout(() => (animateLeave.value = false), 400));
}

// клик по хештегу в заметке ищет по нему; повторный клик по тому же тегу снимает поиск
function onTag(tag: string): void {
    query.value = normalizeForSearch(query.value.trim()) === normalizeForSearch(tag) ? '' : tag;
}

async function onRemove(task: Task): Promise<void> {
    const ok = await confirm(t('tasks.notify.remove.title'))
        .message(t('tasks.notify.remove.message', [taskTitle(task)]))
        .ok(t('ui.confirm.yes'))
        .cancel(t('ui.confirm.no'))
        .danger();
    if (ok) withLeaveAnimation(() => tasks.remove(task.id));
}

// сообщения о состоянии хранилища: один раз при старте и при сбое записи
onMounted(() => {
    const { status, invalid, persistent } = tasks.startup;
    if (status === 'corrupt') toast.warning(t('storage.corrupt'));
    if (status === 'newer-version') toast.warning(t('storage.newerVersion'));
    if (invalid > 0) toast.warning(t('storage.invalid', [invalid]));
    if (!persistent || !settings.persistent) toast.warning(t('storage.memoryOnly'));
});

watch(
    () => tasks.saveFailed,
    (failed) => {
        if (failed) toast.error(t('storage.saveFailed'));
    },
);
</script>

<template>
    <div class="page">
        <!-- панель управления: настройки, вкладки, «добавить» и строка быстрого поиска -->
        <TaoCard class="toolbar" :shadow="false" :padding="12">
            <div class="toolbar-row">
                <TaoButton variant="ghost" :aria-label="t('settings.title')" @click="settingsOpen = true">
                    <TaoIcon name="cog" />
                </TaoButton>
                <TaoTabs class="tabs" justify="center" :items="tabs" :model-value="tab" @update:model-value="onTabChange">
                    <template #label="{ text, value }">
                        <span class="tab-label">
                            {{ text }}
                            <span v-if="(counts[value] ?? 0) > 0 || !searching" class="tab-count">{{ counts[value] ?? 0 }}</span>
                        </span>
                    </template>
                </TaoTabs>
                <TaoButton variant="ghost" :aria-label="t('tasks.create')" @click="openForm('create')">
                    <TaoIcon name="plus" />
                </TaoButton>
            </div>

            <TaoInput v-model="query" class="search" :placeholder="t('tasks.search.placeholder')" @keydown.esc="query = ''">
                <template #prefix><TaoIcon name="search" class="search-icon" /></template>
                <template #suffix>
                    <TaoButton v-if="query" variant="text" class="search-clear" :aria-label="t('tasks.search.clear')" @click="query = ''"><TaoIcon name="cancel" /></TaoButton>
                </template>
            </TaoInput>
            <TaoCheckbox v-model="exact" class="search-exact" :label="t('tasks.search.exact')" />
        </TaoCard>

        <TaoEmpty v-if="visible.length === 0" class="empty" :title="emptyText" />

        <TransitionGroup v-else tag="div" class="list" :name="animateLeave ? 'task' : 'task-instant'" v-bind="collapse">
            <section v-for="group in groups" :key="group.key" class="group">
                <TaoDivider variant="dashed" fade :text="group.label" />
                <TransitionGroup tag="div" class="group-tasks" :name="animateLeave ? 'task' : 'task-instant'" v-bind="collapse">
                    <TaskCard
                        v-for="task in group.tasks"
                        :key="task.id"
                        :task="task"
                        :today="tasks.today"
                        :hide-far="settings.hideFarTasks"
                        :confirm-uncheck="settings.confirmUncheck"
                        :ui-scale="settings.uiScale / 100"
                        can-edit
                        @done="withLeaveAnimation(() => tasks.setDone(task.id, true))"
                        @reopen="withLeaveAnimation(() => tasks.setDone(task.id, false))"
                        @edit="openForm('edit', $event)"
                        @clone="openForm('clone', $event)"
                        @remove="onRemove"
                        @tag="onTag"
                        @toggle-item="(_, index) => tasks.toggleChecklistItem(task.id, index)"
                    />
                </TransitionGroup>
            </section>
        </TransitionGroup>

        <TaskForm v-model="formOpen" :mode="formMode" :task="formTask" @saved="onSaved" />
        <SettingsDrawer v-model="settingsOpen" />
    </div>
</template>

<style scoped>
.page {
    --nextup-gutter: 16px;

    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3, 12px);
    min-height: 100%;
    padding: var(--tao-space-3, 12px) var(--nextup-gutter) var(--tao-space-8, 32px);
    box-sizing: border-box;
}

/* Узкая область (телефон, колонка при встраивании, режим «Мини»): боковые поля и верхний отступ вдвое меньше.
   Запрос идёт к контейнеру `nextup` (см. App.vue), а не к окну: при встраивании ширина окна ничего не говорит. */
@container nextup (max-width: 420px) {
    .page {
        --nextup-gutter: 8px;

        padding-top: 6px;
    }
}

.toolbar {
    background: var(--nextup-bg-card);
    border: 1px solid var(--tao-color-border);
}

.toolbar-row {
    display: flex;
    align-items: center;
    gap: var(--tao-space-2, 8px);
}

.search {
    margin-top: var(--tao-space-3, 12px);
}

.search-exact {
    margin-top: var(--tao-space-2, 8px);
}

/* вкладки одной ширины (89 px в масштабе интерфейса), по центру; в узком ряду сжимаются поровну: «Активные» и «Архив»
   вместе со счётчиками помещаются в 360 px, в том числе при крупном интерфейсе */
.tabs :deep(.tao-tabs__list) {
    width: 100%;
    flex-wrap: nowrap;
    justify-content: center;
}

.tabs :deep(.tao-tabs__tab) {
    /* подписи вкладок растут не больше чем на 15%: ряд «настройки · вкладки · плюс» иначе не помещается в узкий экран */
    font-size: calc(14px * min(var(--nextup-ui-scale, 1), 1.15));
    flex: 0 1 calc(89px * var(--nextup-ui-scale, 1));
    min-width: 0;
    padding-right: 0;
    padding-left: 0;
    justify-content: center;
}

.tab-label {
    position: relative;
    display: inline-block;
}

/* счётчик-бейдж по образцу tao-avatar__badge, но без фона и рамки: нужна только цифра */
.tab-count {
    position: absolute;
    top: -6px;
    right: -25px;
    z-index: 1;
    box-sizing: border-box;
    min-width: 25px;
    height: 16px;
    padding: 0 4px;
    display: inline-flex;
    align-items: center;
    font-size: calc(10px * var(--nextup-ui-scale, 1));
    font-weight: 700;
    line-height: 1;
}

.tabs {
    flex: 1;
    min-width: 0;
}

.list,
.group,
.group-tasks {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.list {
    gap: var(--tao-space-2, 8px);
}

/* появление и уход (карточек и целых групп) идут по высоте: JS в lib/collapse.ts подставляет реальную высоту,
   а плавность даёт этот переход. Отрицательный нижний отступ съедает gap между соседями, чтобы в конце не было скачка */
.task-enter-active,
.task-leave-active {
    overflow: hidden;
    transition:
        height 0.3s ease,
        margin-bottom 0.3s ease,
        opacity 0.25s ease;
}

.task-leave-to {
    height: 0 !important;
    margin-bottom: calc(var(--collapse-gap, 10px) * -1);
    opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
    .task-enter-active,
    .task-leave-active {
        transition: none;
    }
}

.empty {
    margin-top: var(--tao-space-6, 24px);
}
</style>

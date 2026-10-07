<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { confirm, TaoButton, TaoDivider, TaoEmpty, TaoIcon, TaoTabs, toast } from '@1337exp/taoui';
import SettingsDrawer from '@/components/SettingsDrawer.vue';
import TaskCard from '@/components/TaskCard.vue';
import { isoParts } from '@/domain/date';
import { groupByMonth } from '@/domain/lifecycle';
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
const tab = ref<ListTab>('active');

const tabs = computed(() => [
    { key: 'active', label: `${t('tasks.tabs.active')} (${tasks.active.length})` },
    { key: 'archive', label: `${t('tasks.tabs.archive')} (${tasks.archive.length})` },
]);

const visible = computed(() => (tab.value === 'active' ? tasks.active : tasks.archive));

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

async function onRemove(task: Task): Promise<void> {
    const ok = await confirm(t('tasks.notify.remove.title'))
        .message(t('tasks.notify.remove.message', [taskTitle(task)]))
        .ok(t('ui.confirm.yes'))
        .cancel(t('ui.confirm.no'))
        .danger();
    if (ok) tasks.remove(task.id);
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
        <header class="header">
            <h1 class="title">Next Up</h1>
            <TaoButton variant="ghost" :aria-label="t('settings.title')" @click="settingsOpen = true">
                <TaoIcon name="cog" />
            </TaoButton>
        </header>

        <TaoTabs :tabs="tabs" :model-value="tab" @update:model-value="onTabChange" />

        <TaoEmpty v-if="visible.length === 0" class="empty" :title="t('tasks.empty')" />

        <div v-else class="list">
            <section v-for="group in groups" :key="group.key" class="group">
                <TaoDivider variant="dashed" :text="group.label" />
                <TaskCard
                    v-for="task in group.tasks"
                    :key="task.id"
                    :task="task"
                    :today="tasks.today"
                    :hide-far="settings.hideFarTasks"
                    @done="tasks.setDone(task.id, true)"
                    @reopen="tasks.setDone(task.id, false)"
                    @remove="onRemove"
                    @toggle-item="(_, index) => tasks.toggleChecklistItem(task.id, index)"
                />
            </section>
        </div>

        <SettingsDrawer v-model="settingsOpen" />
    </div>
</template>

<style scoped>
.page {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3, 12px);
    min-height: 100%;
    padding: var(--tao-space-3, 12px) var(--tao-space-4, 16px) var(--tao-space-8, 32px);
    box-sizing: border-box;
}

.header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.title {
    margin: 0;
    font-size: var(--tao-font-size-xl);
    font-weight: 500;
    color: var(--tao-color-text-strong);
}

.list,
.group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.list {
    gap: var(--tao-space-2, 8px);
}

.empty {
    margin-top: var(--tao-space-6, 24px);
}
</style>

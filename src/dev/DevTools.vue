<script setup lang="ts">
import { confirm, TaoButton } from '@1337exp/taoui';
import { todayIso } from '@/domain/date';
import { useTasksStore } from '@/stores/tasks';
import { buildDemoTasks } from '@/dev/demo';

// Только для разработки: показывается в режиме разработки (см. dev/mode.ts и SettingsDrawer).
// Кнопка заменяет все задачи, поэтому без подтверждения её не нажать: по IP сюда может зайти и обычный пользователь.
const tasks = useTasksStore();

async function fillDemo(): Promise<void> {
    const ok = await confirm('Replace all tasks with demo data?').message('Your current tasks will be lost. Export them first if you need them.').danger();
    if (ok) tasks.replaceAll(buildDemoTasks(todayIso(), Date.now()));
}
</script>

<template>
    <TaoButton variant="secondary" @click="fillDemo">Demo data (dev only)</TaoButton>
</template>

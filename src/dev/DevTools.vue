<script setup lang="ts">
import { confirm, TaoButton, toast } from '@1337exp/taoui';
import { todayIso } from '@/domain/date';
import { useTasksStore } from '@/stores/tasks';
import { buildDemoTasks } from '@/dev/demo';
import { showNotice } from '@/lib/notifications';

// Только для разработки: показывается в режиме разработки (см. dev/mode.ts и SettingsDrawer).
// Кнопка заменяет все задачи, поэтому без подтверждения её не нажать: по IP сюда может зайти и обычный пользователь.
const tasks = useTasksStore();

async function fillDemo(): Promise<void> {
    const ok = await confirm('Replace all tasks with demo data?').message('Your current tasks will be lost. Export them first if you need them.').danger();
    if (ok) tasks.replaceAll(buildDemoTasks(todayIso(), Date.now()));
}

// проверить оповещение, не дожидаясь смены даты (нужно разрешение)
async function testNotice(): Promise<void> {
    const ok = await showNotice('Next Up', 'Test notification');
    if (!ok) toast.warning('Notification was not shown: grant permission first (Settings → notify).');
}
</script>

<template>
    <TaoButton variant="secondary" @click="fillDemo">Demo data (dev only)</TaoButton>
    <TaoButton variant="secondary" @click="testNotice">Test notification (dev only)</TaoButton>
</template>

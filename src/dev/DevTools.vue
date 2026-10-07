<script setup lang="ts">
import { TaoButton } from '@1337exp/taoui';
import { todayIso } from '@/domain/date';
import { useTasksStore } from '@/stores/tasks';
import { buildDemoTasks } from '@/dev/demo';

// Только для разработки: в рабочую сборку этот файл не попадает (см. SettingsDrawer).
const tasks = useTasksStore();

function fillDemo(): void {
    tasks.replaceAll(buildDemoTasks(todayIso(), Date.now()));
}
</script>

<template>
    <TaoButton variant="secondary" @click="fillDemo">Demo data (dev only)</TaoButton>
</template>

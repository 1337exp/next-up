<script setup lang="ts">
import { computed } from 'vue';
import LanguageGate from '@/views/LanguageGate.vue';
import TasksView from '@/views/TasksView.vue';
import { MINI_WIDTH_PX } from '@/domain/settings';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();

// Ширину ограничиваем у корня приложения, а не у <html>: так оно не трогает страницу-хозяина при встраивании.
const rootStyle = computed(() => (settings.widthMode === 'mini' ? { '--nextup-max-width': `${MINI_WIDTH_PX}px` } : undefined));
</script>

<template>
    <div class="app" :data-width="settings.widthMode" :style="rootStyle">
        <LanguageGate v-if="settings.needsLanguage" />
        <TasksView v-else />
    </div>
</template>

<style scoped>
.app {
    box-sizing: border-box;
    width: 100%;
    max-width: var(--nextup-max-width, none);
    min-height: 100%;
    margin: 0 auto;
}
</style>

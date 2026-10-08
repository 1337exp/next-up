<script setup lang="ts">
import { computed } from 'vue';
import { TaoScrollTop } from '@1337exp/taoui';
import LanguageGate from '@/views/LanguageGate.vue';
import TasksView from '@/views/TasksView.vue';
import { MINI_WIDTH_PX } from '@/domain/settings';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const { t } = useI18n();

// Ширину ограничиваем у корня приложения, а не у <html>: так оно не трогает страницу-хозяина при встраивании.
const rootStyle = computed(() => (settings.widthMode === 'mini' ? { '--nextup-max-width': `${MINI_WIDTH_PX}px` } : undefined));
</script>

<template>
    <div class="app" :data-width="settings.widthMode" :style="rootStyle">
        <LanguageGate v-if="settings.needsLanguage" />
        <TasksView v-else />
    </div>

    <!-- вне .app: у контейнера запросов position: fixed считался бы от него, а не от окна -->
    <TaoScrollTop v-if="!settings.needsLanguage" :aria-label="t('tasks.scrollTop')" />
</template>

<style scoped>
.app {
    /* контейнер для @container-запросов: отступы подстраиваются под ширину самого приложения */
    container: nextup / inline-size;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--nextup-max-width, none);
    min-height: 100%;
    margin: 0 auto;
}
</style>

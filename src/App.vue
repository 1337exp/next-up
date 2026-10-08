<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { TaoScrollTop } from '@1337exp/taoui';
import LanguageGate from '@/views/LanguageGate.vue';
import TasksView from '@/views/TasksView.vue';
import { MINI_WIDTH_PX } from '@/domain/settings';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const settings = useSettingsStore();
const { t } = useI18n();

// Ширину ограничиваем у корня приложения, а не у <html>: так оно не трогает страницу-хозяина при встраивании.
// Общий масштаб кладём на <html>: модалки, панель настроек и уведомления выводятся в <body>, вне .app, и иначе
// остались бы прежними. Переменная с префиксом приложения, поэтому страницу-хозяина при встраивании не задевает;
// токены TaoUi умножаются на неё в styles/theme.css.
watchEffect(() => document.documentElement.style.setProperty('--nextup-ui-scale', String(settings.uiScale / 100)));

// «Мини» растёт вместе с интерфейсом: колонка 400 px при крупном шрифте была бы узкой.
// Размеры шрифта тоже переменными: карточки читают их через calc(), не зная про настройки.
const rootStyle = computed(() => ({
    ...(settings.widthMode === 'mini' ? { '--nextup-max-width': `${MINI_WIDTH_PX * (settings.uiScale / 100)}px` } : {}),
    '--nextup-note-scale': settings.noteScale / 100,
    '--nextup-item-scale': settings.itemScale / 100,
    '--nextup-header-scale': settings.headerScale / 100,
}));
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
    min-height: 100%;
    margin: 0 auto;
}

/* на телефоне «Мини» не нужен: колонка и так на всю ширину, а лишние поля только съедают место */
@media (min-width: 451px) {
    .app {
        max-width: var(--nextup-max-width, none);
    }
}
</style>

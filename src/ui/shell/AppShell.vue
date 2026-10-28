<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TaoNav, TaoScrollTop, toast, type TaoNavItem } from '@1337exp/taoui';
import { createCommands, historyCommands } from '@1337exp/taoux/commands';
import { useNotesStore } from '@/app/notes';
import { useI18n } from '@/i18n';
import NoteList from '@/ui/notes/NoteList.vue';
import SearchBar from '@/ui/notes/SearchBar.vue';
import TagsView from '@/ui/notes/TagsView.vue';
import { toggleTag, useSearch } from '@/ui/notes/useNotes';
import SettingsDrawer from './SettingsDrawer.vue';

type Section = 'active' | 'archive' | 'tags';

const { t } = useI18n();
const store = useNotesStore();
const { found, searching } = useSearch();

const section = ref<Section>('active');
const settingsOpen = ref(false);

// счётчики в навигации показывают найденное, пока идёт поиск
const items = computed<TaoNavItem[]>(() => [
    { id: 'active', label: t('nav.active'), icon: 'notes', badge: found.value.active.length || undefined },
    { id: 'archive', label: t('nav.archive'), icon: 'tao-folder', badge: found.value.archive.length || undefined },
    { id: 'tags', label: t('nav.tags'), icon: 'tag' },
    { id: 'settings', label: t('nav.settings'), icon: 'settings' },
]);

function onNav(id: string): void {
    if (id === 'settings') settingsOpen.value = true;
    else section.value = id as Section;
}

// клик по тегу в списке тегов: ищем по нему среди активных
function onTagSelect(tag: string): void {
    toggleTag(tag);
    section.value = 'active';
}

// пока ищем, не оставляем пользователя на разделе, где поиск не работает
watch(searching, (value) => {
    if (value && section.value === 'tags') section.value = 'active';
});

// --- команды и горячие клавиши (TaoUX): отмена/повтор, поиск, настройки ---
const commands = createCommands([
    ...historyCommands(store, { labels: { undo: () => t('command.undo'), redo: () => t('command.redo') } }),
    { id: 'search', label: () => t('command.search'), shortcut: '/', run: () => document.querySelector<HTMLInputElement>('[data-search] input')?.focus() },
    { id: 'settings', label: () => t('command.settings'), shortcut: 'Mod+,', run: () => (settingsOpen.value = true) },
]);

let unbind = (): void => {};
onMounted(() => (unbind = commands.bind(document)));
onBeforeUnmount(() => unbind());

// сообщения о состоянии хранилища: один раз при старте и при сбое записи
onMounted(() => {
    const { status, invalid } = store.startup;
    if (status === 'corrupt') toast.warning(t('storage.corrupt'));
    if (status === 'newer') toast.warning(t('storage.newerVersion'));
    if (status === 'migrated') toast.info(t('storage.migrated'));
    if (invalid > 0) toast.warning(t('storage.invalid', [invalid]));
});

watch(
    () => store.saveFailed,
    (failed) => {
        if (failed) toast.danger(t('storage.saveFailed'));
    },
);
</script>

<template>
    <TaoNav :model-value="section" class="nav" :items="items" :aria-label="t('nav.label')" :more-label="t('nav.more')" @update:model-value="onNav">
        <main class="page">
            <SearchBar class="search" />

            <TagsView v-if="section === 'tags'" @select="onTagSelect" />
            <NoteList v-else :section="section" />
        </main>
    </TaoNav>

    <SettingsDrawer v-model="settingsOpen" />
    <TaoScrollTop :aria-label="t('list.scrollTop')" />
</template>

<style scoped>
.nav {
    min-height: 100%;
}

.page {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: var(--tao-space-4);
}

.search {
    position: sticky;
    top: 0;
    z-index: 1;
    margin-block: calc(var(--tao-space-2) * -1);
    padding-block: var(--tao-space-2);
    background: var(--tao-color-bg);
}
</style>

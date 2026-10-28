<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TaoButton, TaoModal, TaoNav, TaoScrollTop, TaoSplit, toast, type TaoNavItem } from '@1337exp/taoui';
import { createCommands, historyCommands } from '@1337exp/taoux/commands';
import { useNotesStore } from '@/app/notes';
import { useI18n } from '@/i18n';
import EmptyState from '@/ui/components/EmptyState.vue';
import NoteEditor from '@/ui/editor/NoteEditor.vue';
import { useEditor } from '@/ui/editor/useEditor';
import { toggleTag, useSearch } from '@/ui/notes/useNotes';
import ListColumn from './ListColumn.vue';
import SettingsDrawer from './SettingsDrawer.vue';
import { useWide } from './useWide';

type Section = 'active' | 'archive' | 'tags' | 'trash';

const { t } = useI18n();
const store = useNotesStore();
const editor = useEditor();
const wide = useWide();
const { found, searching } = useSearch();

const section = ref<Section>('active');
const settingsOpen = ref(false);
const listWidth = ref(480);

// счётчики в навигации показывают найденное, пока идёт поиск
const items = computed<TaoNavItem[]>(() => [
    { id: 'active', label: t('nav.active'), icon: 'notes', badge: found.value.active.length || undefined },
    { id: 'archive', label: t('nav.archive'), icon: 'tao-folder', badge: found.value.archive.length || undefined },
    { id: 'tags', label: t('nav.tags'), icon: 'tag' },
    { id: 'trash', label: t('nav.trash'), icon: 'trash', badge: store.trash.length || undefined },
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

const editorTitle = computed(() => (editor.state.value ? t(`editor.title.${editor.state.value.mode}`) : ''));

// --- команды и горячие клавиши (TaoUX): новая заметка, отмена/повтор, поиск, настройки ---
const commands = createCommands([
    { id: 'create', label: () => t('command.create'), shortcut: 'N', run: editor.openCreate },
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
        <template #action>
            <TaoButton icon="tao-plus" @click="editor.openCreate()"><span class="tao-nav__action-label">{{ t('nav.create') }}</span></TaoButton>
        </template>

        <!-- ПК: список и редактор рядом, у каждого своя прокрутка -->
        <div v-if="wide" class="wide">
            <TaoSplit v-model="listWidth" unit="px" :min="360" :max="760" :min-end="360">
                <template #start>
                    <div class="pane"><ListColumn :section="section" @tag="onTagSelect" /></div>
                </template>
                <template #end>
                    <div class="pane">
                        <section v-if="editor.state.value" class="editor-pane">
                            <header class="editor-head">
                                <h2 class="tao-heading-5">{{ editorTitle }}</h2>
                                <TaoButton variant="ghost" icon="tao-close" :aria-label="t('ui.button.close')" @click="editor.close()" />
                            </header>
                            <NoteEditor :key="editor.state.value.key" @close="editor.close()" />
                        </section>
                        <EmptyState v-else icon="edit" :title="t('editor.empty')" />
                    </div>
                </template>
            </TaoSplit>
        </div>

        <!-- телефон и планшет: список на всю ширину, редактор поверх -->
        <main v-else class="narrow"><ListColumn :section="section" @tag="onTagSelect" /></main>
    </TaoNav>

    <TaoModal v-if="!wide" :model-value="!!editor.state.value" :title="editorTitle" @update:model-value="(open: boolean) => !open && editor.close()">
        <NoteEditor v-if="editor.state.value" :key="editor.state.value.key" @close="editor.close()" />
    </TaoModal>

    <SettingsDrawer v-model="settingsOpen" />
    <TaoScrollTop v-if="!wide" :aria-label="t('list.scrollTop')" />
</template>

<style scoped>
.nav {
    /* на короткой странице (пустой раздел) нижняя панель остаётся внизу окна */
    min-height: 100dvh;
}

.narrow {
    max-width: 760px;
    margin: 0 auto;
}

.wide {
    height: 100dvh;
}

.pane {
    box-sizing: border-box;
    height: 100%;
    overflow: auto;
}

.editor-pane {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-4);
    max-width: 640px;
    padding: var(--tao-space-4);
}

.editor-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.editor-head h2 {
    margin: 0;
}

</style>

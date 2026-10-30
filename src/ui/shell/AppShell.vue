<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TaoButton, TaoModal, TaoNav, TaoScrollTop, TaoSplit, toast, type TaoNavItem } from '@1337exp/taoui';
import { createCommands, historyCommands } from '@1337exp/taoux/commands';
import { useNotesStore } from '@/app/notes';
import { useDayNotifier } from '@/app/notify';
import { useSyncStore } from '@/app/sync';
import { useI18n } from '@/i18n';
import EmptyState from '@/ui/components/EmptyState.vue';
import NoteEditor from '@/ui/editor/NoteEditor.vue';
import NoteView from '@/ui/editor/NoteView.vue';
import { useEditor } from '@/ui/editor/useEditor';
import { useSearch } from '@/ui/notes/useNotes';
import ListColumn from './ListColumn.vue';
import SettingsDrawer from './SettingsDrawer.vue';
import SettingsForm from './SettingsForm.vue';
import { usePhone, useWide } from './useWide';

type Section = 'active' | 'archive' | 'trash' | 'settings';

const { t } = useI18n();
const store = useNotesStore();
// стор синхронизации живёт всё время работы приложения: сам следит за правками, сетью и возвратом на вкладку
const sync = useSyncStore();
useDayNotifier();
const editor = useEditor();
const wide = useWide();
const phone = usePhone();
const { found } = useSearch();

const section = ref<Section>('active');
const settingsOpen = ref(false);
const listWidth = ref(480);

// счётчики в навигации показывают найденное, пока идёт поиск
const items = computed<TaoNavItem[]>(() => [
    { id: 'active', label: t('nav.active'), icon: 'tao-file', badge: found.value.active.length || undefined },
    { id: 'archive', label: t('nav.archive'), icon: 'tao-folder', badge: found.value.archive.length || undefined },
    { id: 'trash', label: t('nav.trash'), icon: 'tao-trash', badge: store.trash.length || undefined },
    { id: 'settings', label: t('nav.settings'), icon: 'tao-settings', badge: sync.status === 'error' ? true : undefined },
]);

// Настройки: на ПК и планшете — раздел рядом с меню (выезжающая справа панель была бы на другом краю широкого экрана),
// на телефоне — нижний лист у большого пальца, где и меню.
function openSettings(): void {
    if (phone.value) settingsOpen.value = true;
    else section.value = 'settings';
}

function onNav(id: string): void {
    if (id === 'settings') openSettings();
    else section.value = id as Section;
}

// из правки возвращаемся к чтению той же заметки: «Готово» и Esc не выбрасывают из неё совсем
function currentNote() {
    const id = editor.state.value?.source?.id;
    return id ? store.notes.find((n) => n.id === id && n.deletedAt === null) : undefined;
}
function closeEditor(): void {
    const note = editor.state.value?.mode === 'edit' ? currentNote() : undefined;
    if (note) editor.openRead(note);
    else editor.close();
}

const editorTitle = computed(() => (editor.state.value ? t(`editor.title.${editor.state.value.mode}`) : ''));

// --- команды и горячие клавиши (TaoUX): новая заметка, отмена/повтор, поиск, настройки ---
const commands = createCommands([
    {
        id: 'edit',
        label: () => t('command.edit'),
        shortcut: 'E',
        enabled: () => editor.state.value?.mode === 'read',
        run: () => {
            const note = currentNote();
            if (note) editor.openEdit(note);
        },
    },
    { id: 'create', label: () => t('command.create'), shortcut: 'N', run: editor.openCreate },
    ...historyCommands(store, { labels: { undo: () => t('command.undo'), redo: () => t('command.redo') } }),
    { id: 'search', label: () => t('command.search'), shortcut: '/', run: () => document.querySelector<HTMLInputElement>('[data-search] input')?.focus() },
    { id: 'settings', label: () => t('command.settings'), shortcut: 'Mod+,', run: openSettings },
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
    (reason) => {
        if (reason) toast.danger(reason === 'quota' ? t('storage.quotaFull') : reason === 'denied' ? t('storage.memoryOnly') : t('storage.saveFailed'));
    },
);
</script>

<template>
    <TaoNav :model-value="section" class="nav" :floating="phone" :surface="phone ? 'glass' : 'grain'" badge-tone="neutral" :items="items" :aria-label="t('nav.label')" :more-label="t('nav.more')" @update:model-value="onNav">
        <!-- на телефоне главное действие — поле ввода внизу списка, круглая «+» не нужна -->
        <template #footer>
            <a class="about" href="https://github.com/1337exp/next-up" target="_blank" rel="noopener noreferrer">{{ t('app.name') }} v3</a>
        </template>

        <template v-if="!phone" #action>
            <TaoButton icon="tao-plus" shortcut="N" @click="editor.openCreate()"><span class="tao-nav__action-label">{{ t('nav.create') }}</span></TaoButton>
        </template>

        <!-- Настройки: страница рядом с меню (на телефоне вместо неё нижний лист) -->
        <main v-if="section === 'settings'" class="settings-page" :class="{ scroll: wide }">
            <h2 class="tao-heading-5">{{ t('settings.title') }}</h2>
            <SettingsForm />
        </main>

        <!-- ПК: список и редактор рядом, у каждого своя прокрутка -->
        <main v-else-if="wide" class="wide">
            <TaoSplit v-model="listWidth" unit="px" :min="360" :max="760" :min-end="360">
                <template #start>
                    <div class="pane"><ListColumn :section="section" /></div>
                </template>
                <template #end>
                    <div class="pane">
                        <section v-if="editor.state.value" class="editor-pane">
                            <NoteView v-if="editor.state.value.mode === 'read'" :key="editor.state.value.key" @close="editor.close()" />
                            <template v-else>
                                <header class="editor-head">
                                    <h2 class="tao-heading-5">{{ editorTitle }}</h2>
                                    <TaoButton variant="ghost" icon="tao-close" :aria-label="t('ui.button.close')" @click="closeEditor" />
                                </header>
                                <NoteEditor :key="editor.state.value.key" @close="closeEditor" />
                            </template>
                        </section>
                        <EmptyState v-else icon="tao-edit" :title="t('editor.empty')" />
                    </div>
                </template>
            </TaoSplit>
        </main>

        <!-- телефон и планшет: список на всю ширину, редактор поверх -->
        <main v-else class="narrow"><ListColumn :section="section" /></main>
    </TaoNav>

    <TaoModal v-if="!wide" fullscreen="narrow" surface="grain" :model-value="!!editor.state.value" :title="editorTitle" @update:model-value="(open: boolean) => !open && editor.close()">
        <div v-if="editor.state.value" class="modal-body">
            <NoteView v-if="editor.state.value.mode === 'read'" :key="editor.state.value.key" @close="editor.close()" />
            <NoteEditor v-else :key="editor.state.value.key" @close="closeEditor" />
        </div>
    </TaoModal>

    <SettingsDrawer v-if="phone" v-model="settingsOpen" />
    <TaoScrollTop v-if="!wide" :aria-label="t('list.scrollTop')" />
</template>

<style scoped>
/* обёртка без коробки: нужна только чтобы передать нижней полосе редактора цвет окна */
.modal-body {
    display: contents;
    --nu-foot-grain: var(--tao-surface-grain-image, none);
    --nu-foot-bg: var(--tao-modal-bg, var(--tao-color-surface-raised));
}

/* окно-диалог (от 600 px): нижний отступ области прокрутки равен --tao-space-5, полоса выходит за него */
@media (min-width: 600px) {
    .modal-body {
        --nu-bleed: var(--tao-space-5);
    }
}

@media (prefers-contrast: more) {
    .modal-body {
        --nu-foot-grain: none;
    }
}

/* текущий раздел отличается не только цветом: ещё и жирностью (цвет различают не все, а у акцента на его же подложке контраст на грани нормы) */
.nav :deep(.tao-nav__item--active .tao-nav__label) {
    font-weight: 700;
}

/* на широком виде меню темнее страницы (зерно даёт surface="grain"); на телефоне там стеклянная плашка */
@media (min-width: 600px) {
    .nav :deep(.tao-nav__panel) {
        /* темнее на одинаковую ступень яркости в любой теме (доля чёрного на светлом давала бы серый бетон) */
        background-color: color-mix(in srgb, var(--tao-color-bg) 94%, black);
        background-color: oklch(from var(--tao-color-bg) calc(l - 0.04) c h);
    }
}

.nav {
    /* на короткой странице (пустой раздел) нижняя панель остаётся внизу окна */
    min-height: 100dvh;
    /* на очень широком мониторе приложение не растягивается, а стоит по центру: ленте заметок больше не нужно */
    max-width: var(--nu-app-max);
    margin-inline: auto;
}

.narrow {
    max-width: 760px;
    margin: 0 auto;
}

.wide {
    height: 100dvh;
}

.settings-page {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-5);
    /* поля формы не должны тянуться через весь экран: колонка в удобную для чтения ширину, с воздухом у меню */
    max-width: 560px;
    padding: var(--tao-space-8);
}

@media (max-width: 599px) {
    .settings-page {
        padding: var(--tao-space-4);
    }
}

/* подпись внизу меню: едва заметная, как ссылка в подвале */
.about {
    display: block;
    margin: 0;
    text-decoration: none;
    padding-inline: var(--tao-space-3);
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
    opacity: 0.55;
}

.about:hover,
.about:focus-visible {
    opacity: 1;
    text-decoration: underline;
}

.settings-page h2 {
    margin: 0;
}

/* на широком экране у страницы своя прокрутка, как у панелей списка и редактора */
.settings-page.scroll {
    height: 100dvh;
    overflow: auto;
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

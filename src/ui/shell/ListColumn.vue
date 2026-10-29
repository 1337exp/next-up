<script setup lang="ts">
import { computed } from 'vue';
import { useNotesStore } from '@/app/notes';
import { bucketOf } from '@/core/lifecycle';
import { dateLong, useI18n } from '@/i18n';
import NoteList from '@/ui/notes/NoteList.vue';
import QuickAdd from '@/ui/notes/QuickAdd.vue';
import SearchBar from '@/ui/notes/SearchBar.vue';
import TagsView from '@/ui/notes/TagsView.vue';
import TrashView from '@/ui/notes/TrashView.vue';

const props = defineProps<{ section: 'active' | 'archive' | 'tags' | 'trash' }>();
defineEmits<{ tag: [tag: string] }>();

const { t, locale } = useI18n();
const store = useNotesStore();

// шапка отвечает на главный вопрос одним взглядом: какой сегодня день и сколько на нём
const title = computed(() => (props.section === 'active' ? dateLong(locale.value, store.today) : props.section === 'archive' ? t('nav.archive') : ''));
const summary = computed(() => {
    if (props.section !== 'active') return '';
    const today = store.active.filter((note) => bucketOf(note.due, store.today) === 'today').length;
    const later = store.active.length - today;
    return today === 0 && later === 0 ? '' : today === 0 ? t('list.summaryNone') : t('list.summary', [today, later]);
});
</script>

<template>
    <div class="column">
        <header v-if="title" class="head">
            <h1 class="title">{{ title }}</h1>
            <p v-if="summary" class="summary">{{ summary }}</p>
        </header>
        <QuickAdd v-if="section === 'active'" />
        <SearchBar v-if="section !== 'trash'" class="search" />
        <TrashView v-if="section === 'trash'" />
        <TagsView v-else-if="section === 'tags'" @select="$emit('tag', $event)" />
        <NoteList v-else :section="section" />
    </div>
</template>

<style scoped>
.column {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3);
    width: 100%;
    padding: var(--tao-space-4);
}

.head {
    padding-inline: var(--tao-space-1);
}

.title {
    margin: 0;
    font-size: var(--tao-font-size-3xl);
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.25;
}

.summary {
    margin: var(--tao-space-1) 0 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
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

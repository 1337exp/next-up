<script setup lang="ts">
import NoteList from '@/ui/notes/NoteList.vue';
import SearchBar from '@/ui/notes/SearchBar.vue';
import TagsView from '@/ui/notes/TagsView.vue';
import TrashView from '@/ui/notes/TrashView.vue';

defineProps<{ section: 'active' | 'archive' | 'tags' | 'trash' }>();
defineEmits<{ tag: [tag: string] }>();
</script>

<template>
    <div class="column">
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
    gap: var(--tao-space-4);
    width: 100%;
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

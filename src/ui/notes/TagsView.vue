<script setup lang="ts">
import { computed } from 'vue';
import { TaoTag } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { tagIndex } from '@/core/tags';
import { useI18n } from '@/i18n';
import EmptyState from '@/ui/components/EmptyState.vue';

const emit = defineEmits<{ select: [tag: string] }>();

const { t } = useI18n();
const store = useNotesStore();
const tags = computed(() => tagIndex(store.notes.filter((note) => note.deletedAt === null)));
</script>

<template>
    <EmptyState v-if="tags.length === 0" icon="tao-tag" :title="t('list.tagsEmpty')" :hint="t('list.tagsEmptyHint')" />
    <ul v-else class="tags">
        <li v-for="tag in tags" :key="tag.name.toLocaleLowerCase()">
            <TaoTag tone="neutral" clickable role="button" tabindex="0" @click="emit('select', tag.name)" @keydown.enter="emit('select', tag.name)">#{{ tag.name }} · {{ tag.count }}</TaoTag>
        </li>
    </ul>
</template>

<style scoped>
.tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
}
</style>

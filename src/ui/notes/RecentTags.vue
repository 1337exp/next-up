<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoPopover, TaoTag } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { recentTags } from '@/core/tags';
import { useI18n } from '@/i18n';
import TagsView from './TagsView.vue';
import { toggleTag, useSearch } from './useNotes';

/**
 * Пять тегов, которыми пользовались последними: видно, что сейчас «горячее». Остальные — за чипом «Все теги…»
 * (отдельного раздела меню нет: тегов мало, а место в меню дорого).
 */
const { t } = useI18n();
const store = useNotesStore();
const { query } = useSearch();

const live = computed(() => store.notes.filter((note) => note.deletedAt === null));
const tags = computed(() => recentTags(live.value));
const hasTags = computed(() => tags.value.length > 0);
const isOn = (name: string): boolean => query.value.trim().toLocaleLowerCase() === `#${name}`.toLocaleLowerCase();

const allOpen = ref(false);
function pick(name: string): void {
    allOpen.value = false;
    toggleTag(name);
}
</script>

<template>
    <ul v-if="hasTags" class="recent" :aria-label="t('list.recentTags')">
        <li v-for="tag in tags" :key="tag.name.toLocaleLowerCase()">
            <TaoTag :tone="isOn(tag.name) ? undefined : 'neutral'" clickable role="button" tabindex="0" :aria-pressed="isOn(tag.name)" @click="toggleTag(tag.name)" @keydown.enter="toggleTag(tag.name)">#{{ tag.name }}</TaoTag>
        </li>
        <li>
            <TaoPopover v-model="allOpen" placement="bottom-start">
                <template #trigger>
                    <TaoTag tone="neutral" clickable role="button" tabindex="0" aria-haspopup="true" @keydown.enter="allOpen = !allOpen">{{ t('list.allTags') }}</TaoTag>
                </template>
                <div class="all"><TagsView @select="pick" /></div>
            </TaoPopover>
        </li>
    </ul>
</template>

<style scoped>
.recent {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
    margin: 0;
    padding: 0;
    list-style: none;
}

.all {
    max-width: min(22rem, 80vw);
    max-height: 50vh;
    overflow: auto;
    padding: var(--tao-space-1);
}
</style>

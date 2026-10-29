<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { bucketOf } from '@/core/lifecycle';
import { dateLong, useI18n } from '@/i18n';
import NoteList from '@/ui/notes/NoteList.vue';
import QuickAdd from '@/ui/notes/QuickAdd.vue';
import RecentTags from '@/ui/notes/RecentTags.vue';
import SearchBar from '@/ui/notes/SearchBar.vue';
import WeekStrip from '@/ui/notes/WeekStrip.vue';
import { useSettingsStore } from '@/app/settings';
import { useSearch } from '@/ui/notes/useNotes';
import TrashView from '@/ui/notes/TrashView.vue';
import { usePhone } from './useWide';

const props = defineProps<{ section: 'active' | 'archive' | 'trash' }>();

const { t, locale } = useI18n();
const store = useNotesStore();
const phone = usePhone();
const { settings } = useSettingsStore();
const { searching } = useSearch();

// шапка отвечает на главный вопрос одним взглядом: какой сегодня день и сколько на нём
const title = computed(() => (props.section === 'active' ? dateLong(locale.value, store.today) : props.section === 'archive' ? t('nav.archive') : ''));
const summary = computed(() => {
    if (props.section !== 'active') return '';
    const today = store.active.filter((note) => bucketOf(note.due, store.today) === 'today').length;
    const later = store.active.length - today;
    return today === 0 && later === 0 ? '' : today === 0 ? t('list.summaryNone') : t('list.summary', [today, later]);
});

// поиск — в шапке (на телефоне за кнопкой-лупой: заголовок не теснится)
const hasSearch = computed(() => props.section === 'active' || props.section === 'archive');
const searchOpen = ref(false);
const showSearchField = computed(() => hasSearch.value && (!phone.value || searchOpen.value || searching.value));
</script>

<template>
    <div class="column">
        <header v-if="title" class="head">
            <div class="head-text">
                <h1 class="title">{{ title }}</h1>
                <p v-if="summary" class="summary">{{ summary }}</p>
            </div>
            <SearchBar v-if="showSearchField && !phone" class="head-search" />
            <TaoButton v-else-if="phone && hasSearch" variant="ghost" icon="tao-search" :pressed="searchOpen" :aria-label="t('search.placeholder')" @click="searchOpen = !searchOpen" />
        </header>
        <SearchBar v-if="showSearchField && phone" autofocus />
        <WeekStrip v-if="section === 'active' && settings.showWeek" />
        <QuickAdd v-if="section === 'active'" />
        <RecentTags v-if="section === 'active'" />
        <TrashView v-if="section === 'trash'" />
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

/* внизу ленты запас под закреплённое поле ввода и плавающую панель */
@media (max-width: 599px) {
    .column {
        padding-bottom: calc(var(--nu-bar-h) + var(--tao-space-4));
    }
}

.head {
    display: flex;
    gap: var(--tao-space-3);
    align-items: flex-start;
    padding-inline: var(--tao-space-1);
}

.head-text {
    flex: 1;
    min-width: 0;
}

.head-search {
    flex: 0 1 12rem;
    min-width: 0;
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
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { isoParts, formatUserDate } from '@/core/date';
import { groupByBucket, groupByMonth, groupRuns, type ArchiveEntry } from '@/core/lifecycle';
import { monthName, useI18n } from '@/i18n';
import { useEditor } from '@/ui/editor/useEditor';
import EmptyState from '@/ui/components/EmptyState.vue';
import NoteRow from './NoteRow.vue';
import { toggleTag, useNoteActions, useSearch } from './useNotes';

const props = defineProps<{ section: 'active' | 'archive' }>();

const { t, locale } = useI18n();
const store = useNotesStore();
const { found, searching, query } = useSearch();
const actions = useNoteActions();
const editor = useEditor();

const visible = computed(() => found.value[props.section]);
const emptyHint = computed(() => (searching.value ? t('list.searchEmptyHint') : props.section === 'active' ? t('list.emptyActiveHint') : ''));
const emptyText = computed(() => (searching.value ? t('list.searchEmpty') : props.section === 'active' ? t('list.emptyActive') : t('list.emptyArchive')));

interface Group {
    key: string;
    label: string;
    /** Группа «Сегодня» отмечается точкой акцента. */
    today: boolean;
    entries: ArchiveEntry[];
}

const asEntries = (notes: readonly (typeof visible.value)[number][]): ArchiveEntry[] => notes.map((note): ArchiveEntry => ({ kind: 'note', note }));

// активные группируются по времени («Сегодня», «Завтра», …), архив — по месяцам: год добавляем, если он не текущий
const groups = computed<Group[]>(() => {
    if (props.section === 'active') {
        return groupByBucket(visible.value, store.today).map((group) => ({ key: group.key, label: t(`date.${group.key}`), today: group.key === 'today', entries: asEntries(group.items) }));
    }
    const currentYear = isoParts(store.today).year;
    return groupByMonth(visible.value).map((group) => ({
        key: group.key,
        label: group.year === currentYear ? monthName(locale.value, group.month) : `${monthName(locale.value, group.month)} ${group.year}`,
        today: false,
        // в архиве подряд идущие повторы одной серии сворачиваются в одну строку
        entries: groupRuns(group.items),
    }));
});

const openRuns = ref(new Set<string>());
function toggleRun(key: string): void {
    const next = new Set(openRuns.value);
    if (!next.delete(key)) next.add(key);
    openRuns.value = next;
}

const runKey = (entry: Extract<ArchiveEntry, { kind: 'run' }>): string => `${entry.series}@${entry.notes[0]!.due}`;
const runTitle = (entry: Extract<ArchiveEntry, { kind: 'run' }>): string => {
    const first = entry.notes[0]!;
    const last = entry.notes[entry.notes.length - 1]!;
    return t('list.run', [entry.notes.length, formatUserDate(last.due), formatUserDate(first.due)]);
};
</script>

<template>
    <EmptyState v-if="visible.length === 0" :icon="searching ? 'tao-search' : section === 'active' ? 'tao-file' : 'tao-folder'" :title="emptyText" :hint="emptyHint">
        <template v-if="searching" #action>
            <TaoButton variant="secondary" @click="query = ''">{{ t('search.clear') }}</TaoButton>
        </template>
    </EmptyState>

    <div v-else class="list">
        <section v-for="group in groups" :key="group.key" class="group" :aria-label="group.label">
            <h2 class="group-title">
                <span v-if="group.today" class="dot" aria-hidden="true" />
                {{ group.label }}
                <span class="count">{{ group.entries.length }}</span>
            </h2>

            <template v-for="entry in group.entries" :key="entry.kind === 'run' ? runKey(entry) : entry.note.id">
                <NoteRow
                    v-if="entry.kind === 'note'"
                    :note="entry.note"
                    :today="store.today"
                    :selected="editor.state.value?.activeId === entry.note.id"
                    @open="editor.openRead" @edit="editor.openEdit"
                    @clone="editor.openClone"
                    @done="actions.done"
                    @reopen="actions.reopen"
                    @remove="actions.remove"
                    @tag="toggleTag"
                />

                <div v-else class="run">
                    <TaoButton variant="ghost" block @click="toggleRun(runKey(entry))">
                        <span class="run-line">
                            <span class="run-title">{{ entry.notes[0]!.body.split('\n')[0] }}</span>
                            <span class="run-meta">{{ runTitle(entry) }}</span>
                        </span>
                    </TaoButton>
                    <template v-if="openRuns.has(runKey(entry))">
                        <NoteRow
                            v-for="note in entry.notes"
                            :key="note.id"
                            :note="note"
                            :today="store.today"
                            :selected="editor.state.value?.activeId === note.id"
                            @open="editor.openRead" @edit="editor.openEdit"
                            @clone="editor.openClone"
                            @done="actions.done"
                            @reopen="actions.reopen"
                            @remove="actions.remove"
                            @tag="toggleTag"
                        />
                    </template>
                </div>
            </template>
        </section>
    </div>
</template>

<style scoped>
.list {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2);
}

.group,
.run {
    display: flex;
    flex-direction: column;
}

.group-title {
    display: flex;
    gap: var(--tao-space-2);
    align-items: center;
    margin: 0;
    padding: var(--tao-space-4) var(--tao-space-3) var(--tao-space-1);
    font-size: var(--tao-font-size-md);
    font-weight: 700;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tao-color-accent);
}

.count {
    color: var(--tao-color-text-muted);
    font-weight: 400;
}

.run-line {
    display: flex;
    flex: 1;
    gap: var(--tao-space-3);
    align-items: baseline;
    min-width: 0;
}

.run-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-align: start;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.run-meta {
    flex: none;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}
</style>

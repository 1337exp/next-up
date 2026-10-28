<script setup lang="ts">
import { computed, ref } from 'vue';
import { TaoButton, TaoDivider, TaoEmpty } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { useSettingsStore } from '@/app/settings';
import { isoParts, formatUserDate } from '@/core/date';
import { groupByMonth, groupRuns, type ArchiveEntry } from '@/core/lifecycle';
import { monthName, useI18n } from '@/i18n';
import NoteCard from './NoteCard.vue';
import { toggleTag, useNoteActions, useSearch } from './useNotes';

const props = defineProps<{ section: 'active' | 'archive' }>();

const { t, locale } = useI18n();
const store = useNotesStore();
const { settings } = useSettingsStore();
const { found, searching } = useSearch();
const actions = useNoteActions();

const visible = computed(() => found.value[props.section]);
const emptyText = computed(() => (searching.value ? t('list.searchEmpty') : props.section === 'active' ? t('list.emptyActive') : t('list.emptyArchive')));

// разделитель «К4 / Октябрь»; год добавляем, если он не текущий (иначе два января подряд не различить)
const groups = computed(() =>
    groupByMonth(visible.value).map((group) => {
        const label = `${t('date.quarterTag')}${group.quarter} / ${monthName(locale.value, group.month)}`;
        return {
            ...group,
            label: group.year === isoParts(store.today).year ? label : `${label} ${group.year}`,
            // в архиве подряд идущие повторы одной серии сворачиваются в одну строку
            entries: (props.section === 'archive' ? groupRuns(group.items) : group.items.map((note): ArchiveEntry => ({ kind: 'note', note }))),
        };
    }),
);

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
    <TaoEmpty v-if="visible.length === 0" class="empty" :title="emptyText" />

    <div v-else class="list">
        <section v-for="group in groups" :key="group.key" class="group">
            <TaoDivider variant="dashed" fade :text="group.label" />

            <template v-for="entry in group.entries" :key="entry.kind === 'run' ? runKey(entry) : entry.note.id">
                <NoteCard
                    v-if="entry.kind === 'note'"
                    :note="entry.note"
                    :today="store.today"
                    :hide-far="settings.hideFar"
                    @done="actions.done"
                    @reopen="actions.reopen"
                    @remove="actions.remove"
                    @toggle-item="actions.toggleItem"
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
                        <NoteCard
                            v-for="note in entry.notes"
                            :key="note.id"
                            :note="note"
                            :today="store.today"
                            :hide-far="settings.hideFar"
                            @done="actions.done"
                            @reopen="actions.reopen"
                            @remove="actions.remove"
                            @toggle-item="actions.toggleItem"
                            @tag="toggleTag"
                        />
                    </template>
                </div>
            </template>
        </section>
    </div>
</template>

<style scoped>
.list,
.group,
.run {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3);
}

.empty {
    margin-top: var(--tao-space-6);
}

.run-line {
    display: flex;
    flex: 1;
    align-items: baseline;
    gap: var(--tao-space-3);
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

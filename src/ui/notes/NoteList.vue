<script setup lang="ts">
import { computed, ref, TransitionGroup } from 'vue';
import { TaoButton } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { isoParts, formatUserDate } from '@/core/date';
import { groupByBucket, groupByMonth, groupRuns, type ArchiveEntry } from '@/core/lifecycle';
import { monthName, useI18n } from '@/i18n';
import { useEditor } from '@/ui/editor/useEditor';
import EmptyState from '@/ui/components/EmptyState.vue';
import NoteRow from './NoteRow.vue';
import { useNoteActions, useSearch } from './useNotes';

const props = defineProps<{ section: 'active' | 'archive' }>();

const { t, locale } = useI18n();
const store = useNotesStore();
const { found, searching, query } = useSearch();
const actions = useNoteActions();
const editor = useEditor();

// одна остановка Tab на весь список (roving tabindex): Tab входит в список, стрелки ходят по строкам.
// Кружок, меню и теги в строке остаются нажимаемыми, но из порядка Tab убраны; меню — клавиша ContextMenu или Shift+F10
const activeId = ref<string | null>(null);
const listEl = ref<HTMLElement | null>(null);

function onFocusIn(event: FocusEvent): void {
    const id = (event.target as HTMLElement).closest<HTMLElement>('[data-note-id]')?.dataset.noteId;
    if (id) activeId.value = id;
}

function onListKeydown(event: KeyboardEvent): void {
    const row = (event.target as HTMLElement).closest<HTMLElement>('.row[data-note-id]');
    if (!row || !listEl.value || (event.target as HTMLElement) !== row) return;
    const rows = [...listEl.value.querySelectorAll<HTMLElement>('.row[data-note-id]')];
    const at = rows.indexOf(row);
    const next = event.key === 'ArrowDown' ? at + 1 : event.key === 'ArrowUp' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? rows.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    rows[Math.max(0, Math.min(rows.length - 1, next))]?.focus();
}

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

// строка, на которой стоит Tab: последняя выбранная, а если её нет в списке — первая
const tabStopId = computed(() => {
    const ids = groups.value.flatMap((group) => group.entries.flatMap((entry) => (entry.kind === 'note' ? [entry.note.id] : [])));
    return activeId.value && ids.includes(activeId.value) ? activeId.value : (ids[0] ?? null);
});

// строка уходит плавно: высота, прозрачность и лёгкий сдвиг; при «уменьшить анимацию» в системе — сразу
const reduceMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function onLeave(el: Element, done: () => void): void {
    if (reduceMotion()) return done();
    const row = el as HTMLElement;
    row.style.height = `${row.offsetHeight}px`;
    row.style.overflow = 'hidden';
    void row.offsetHeight; // зафиксировать начальную высоту до перехода
    row.style.transition = 'height 0.26s ease, opacity 0.2s ease, transform 0.26s ease';
    row.style.height = '0px';
    row.style.opacity = '0';
    row.style.transform = 'translateX(1.5rem)';
    window.setTimeout(done, 280);
}

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

    <div v-else ref="listEl" class="list" @focusin="onFocusIn" @keydown="onListKeydown">
        <section v-for="group in groups" :key="group.key" class="group" :aria-label="group.label">
            <h2 class="group-title">
                <span v-if="group.today" class="dot" aria-hidden="true" />
                {{ group.label }}
                <span class="count">{{ group.entries.length }}</span>
            </h2>

            <TransitionGroup name="note" tag="div" class="rows" @leave="onLeave">
            <div v-for="entry in group.entries" :key="entry.kind === 'run' ? runKey(entry) : entry.note.id">
                <NoteRow
                    v-if="entry.kind === 'note'"
                    :note="entry.note"
                    :today="store.today"
                    :selected="editor.state.value?.activeId === entry.note.id"
                    :tab-stop="tabStopId === entry.note.id"
                    @open="editor.openRead" @edit="editor.openEdit"
                    @clone="editor.openClone"
                    @done="actions.done"
                    @reopen="actions.reopen"
                    @remove="actions.remove"
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
                            :tab-stop="tabStopId === note.id"
                            @open="editor.openRead" @edit="editor.openEdit"
                            @clone="editor.openClone"
                            @done="actions.done"
                            @reopen="actions.reopen"
                            @remove="actions.remove"
                        />
                    </template>
                </div>
            </div>
            </TransitionGroup>
        </section>
    </div>
</template>

<style scoped>
.list {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2);
}

.rows {
    display: flex;
    flex-direction: column;
}

/* новая заметка появляется мягко, остальные плавно сдвигаются на её место */
.note-enter-active {
    transition: opacity 0.22s ease, transform 0.22s ease;
}

.note-enter-from {
    opacity: 0;
    transform: translateY(-0.5rem);
}

.note-move {
    transition: transform 0.26s ease;
}

@media (prefers-reduced-motion: reduce) {
    .note-enter-active,
    .note-move {
        transition: none;
    }
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

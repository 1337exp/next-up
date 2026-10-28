import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { exportSnapshot } from '@/core/codec';
import { isPurged, normalize, splitNotes, trashed } from '@/core/lifecycle';
import { mergeNotes } from '@/core/merge';
import type { Note, NoteInput } from '@/core/model';
import { createNote, purgeNote, removeNote, restoreNote, setDone as setNoteDone, toggleItem as toggleNoteItem, updateNote, type NoteResult } from '@/core/notes';
import { importNotes, type ImportResult, type MarkdownOptions, toMarkdown } from '@/core/transfer';
import { diffEntry, UndoStack } from '@/core/undo';
import { createTodayClock } from '@/app/clock';
import { createNotesRepository, type LoadStatus } from '@/app/persistence';
import type { StorageFailure } from '@1337exp/taoux/storage';

const PERSIST_DELAY_MS = 300;

export const useNotesStore = defineStore('notes', () => {
    const repo = createNotesRepository();
    const loaded = repo.load();
    const writable = loaded.writable;

    const clock = createTodayClock();
    const today = clock.today;

    const notes = ref<Note[]>(normalize(loaded.notes, today.value, Date.now()));
    /** Почему последняя запись не удалась (quota — место кончилось, denied — хранилище запрещено); 
ull — удалась. */
    const saveFailed = ref<StorageFailure | null>(null);

    /** Что случилось при загрузке; интерфейс показывает это один раз при старте. */
    const startup: { status: LoadStatus; invalid: number } = { status: loaded.status, invalid: loaded.invalid };

    // --- сохранение: с короткой паузой, а при уходе со страницы сразу ---
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = loaded.status === 'migrated';

    function flush(): void {
        clearTimeout(timer);
        timer = undefined;
        if (!dirty || !writable) return;
        dirty = false;
        const result = repo.save(notes.value, Date.now());
        saveFailed.value = result.ok ? null : result.reason;
    }

    function schedule(): void {
        dirty = true;
        clearTimeout(timer);
        timer = setTimeout(flush, PERSIST_DELAY_MS);
    }

    // --- отмена: по затронутым заметкам; флаги реактивны, сам стек нет ---
    const stack = new UndoStack();
    const canUndo = ref(false);
    const canRedo = ref(false);
    const syncFlags = (): void => {
        canUndo.value = stack.canUndo;
        canRedo.value = stack.canRedo;
    };

    /** Применить изменение пользователя: пересчитать, запомнить для отмены, сохранить. */
    function commit(next: Note[], key?: string): void {
        const normalized = normalize(next, today.value, Date.now());
        const entry = diffEntry(notes.value, normalized);
        if (entry) stack.record(entry, key);
        notes.value = normalized;
        syncFlags();
        schedule();
    }

    /** Применить результат отмены / повтора / слияния. */
    function replace(next: Note[], remember: boolean): void {
        const normalized = normalize(next, today.value, Date.now());
        if (remember) {
            const entry = diffEntry(notes.value, normalized);
            if (entry) stack.record(entry);
        }
        notes.value = normalized;
        syncFlags();
        schedule();
    }

    function update(id: string, change: (note: Note) => Note, key?: string): void {
        commit(notes.value.map((note) => (note.id === id ? change(note) : note)), key);
    }

    // сменился день: догоняем повторы и переносим вчерашнее в архив (это не действие пользователя, отмены нет)
    watch(today, () => replace(notes.value, false), { flush: 'sync' });
    clock.start();

    // правка из другой вкладки: сливаем, а не затираем
    const unsubscribe = repo.subscribe(() => {
        const fresh = repo.load();
        if (fresh.status === 'ok') replace(mergeNotes(notes.value, fresh.notes).notes, false);
    });

    function onHide(): void {
        if (document.visibilityState === 'hidden') flush();
    }
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);

    onScopeDispose(() => {
        clock.stop();
        unsubscribe();
        flush();
        document.removeEventListener('visibilitychange', onHide);
        window.removeEventListener('pagehide', flush);
    });

    if (dirty) schedule();

    const lists = computed(() => splitNotes(notes.value, today.value));

    return {
        notes,
        today,
        active: computed(() => lists.value.active),
        archive: computed(() => lists.value.archive),
        saveFailed,
        startup,
        canUndo,
        canRedo,

        /**
         * Создать заметку из данных редактора. При ошибке проверки список не меняется.
         * Редактор выдаёт `id` заранее: правки сразу после создания склеиваются с ним в один шаг отмены.
         */
        add(input: NoteInput, id?: string): NoteResult {
            const result = createNote(input, today.value, Date.now(), id);
            if (result.ok) commit([...notes.value, result.note], `edit:${result.note.id}`);
            return result;
        },
        /** Изменить заметку. `notFound` — её успела убрать чистка. Частые правки одной заметки склеиваются при отмене. */
        edit(id: string, input: NoteInput): NoteResult | { ok: false; error: 'notFound' } {
            const current = notes.value.find((note) => note.id === id && note.deletedAt === null);
            if (!current) return { ok: false, error: 'notFound' };
            const result = updateNote(current, input, today.value, Date.now());
            if (result.ok) update(id, () => result.note, `edit:${id}`);
            return result;
        },
        setDone: (id: string, done: boolean) => update(id, (note) => setNoteDone(note, done, Date.now())),
        toggleItem: (id: string, itemId: string) => update(id, (note) => toggleNoteItem(note, itemId, Date.now())),
        remove: (id: string) => update(id, (note) => removeNote(note, Date.now())),
        /** Заменить весь список (демо-данные). Заменённое можно вернуть отменой. */
        replaceAll(next: Note[]): void {
            const now = Date.now();
            const gone = notes.value.filter((n) => n.deletedAt === null).map((n) => removeNote(n, now));
            commit([...gone, ...next]);
        },

        // --- корзина: удалённая заметка остаётся надгробием и 30 дней видна здесь ---
        trash: computed(() => trashed(notes.value, Date.now())),
        restore: (id: string) => update(id, (note) => restoreNote(note, Date.now())),
        /** «Удалить навсегда»: из корзины заметка уходит, а надгробие остаётся для синхронизации. */
        purge: (id: string) => update(id, (note) => purgeNote(note, Date.now())),
        emptyTrash(): void {
            const now = Date.now();
            commit(notes.value.map((note) => (note.deletedAt !== null && !isPurged(note, now) ? purgeNote(note, now) : note)));
        },
        removeAll(): void {
            const now = Date.now();
            commit(notes.value.map((note) => (note.deletedAt === null ? removeNote(note, now) : note)));
        },

        // --- обмен данными ---
        exportJson: (): string => JSON.stringify(exportSnapshot(notes.value, Date.now()), null, 2),
        exportMarkdown: (options?: MarkdownOptions): string => toMarkdown(notes.value, options),
        /** Импорт из текста файла любой известной версии. Список меняется только при успехе; отменяется одним шагом. */
        importText(text: string): ImportResult {
            const result = importNotes(text, notes.value, today.value, Date.now());
            if (result.ok) commit(result.notes);
            return result;
        },

        undo(): boolean {
            const next = stack.undo(notes.value, Date.now());
            if (next) replace(next, false);
            return next !== null;
        },
        redo(): boolean {
            const next = stack.redo(notes.value, Date.now());
            if (next) replace(next, false);
            return next !== null;
        },
        flush,
    };
});

import { nextTick, ref, watch } from 'vue';
import { toast } from '@1337exp/taoui';
import { useRoute } from '@/app/route';
import type { Note } from '@/core/model';
import { useI18n } from '@/i18n';
import { editorKey, type EditorRoute } from '@/core/route';

export type EditorMode = 'read' | 'create' | 'edit' | 'clone';

export interface EditorState {
    mode: EditorMode;
    /** Заметка, из которой открыли (правка, клон); для новой — `null`. */
    source: Note | null;
    /** Увеличивается при каждом открытии: компонент пересоздаётся с чистым черновиком. */
    key: number;
    /** Какая заметка сейчас в редакторе (для подсветки в списке): у новой появляется после первого сохранения. */
    activeId: string | null;
}

// редактор один на приложение и открывается из карточек, меню и горячих клавиш, поэтому состояние на уровне модуля.
// Источник правды — адрес (app/route.ts): открыть или закрыть окно значит сменить адрес, а `bindRoute` приводит состояние в порядок
const state = ref<EditorState | null>(null);
let counter = 0;

function show(mode: EditorMode, source: Note | null): void {
    state.value = { mode, source, key: ++counter, activeId: mode === 'edit' || mode === 'read' ? (source?.id ?? null) : null };
}

function hide(): void {
    const id = state.value?.activeId;
    state.value = null;
    // фокус возвращается на строку заметки: клавиатурный пользователь не теряет место в списке
    if (id) void nextTick(() => document.querySelector<HTMLElement>(`[data-note-id="${CSS.escape(id)}"]`)?.focus());
}

/**
 * Связывает состояние редактора с адресом; вызывать один раз, из корня приложения. `find` отдаёт живую заметку по идентификатору:
 * если её нет (удалена, старая ссылка из истории), адрес очищается и приложение говорит об этом, а не показывает пустое окно.
 */
export function bindEditorToRoute(find: (id: string) => Note | undefined): void {
    const { route, replace } = useRoute();
    const { t } = useI18n();
    let shown = '';
    watch(
        () => route.value,
        (current) => {
            const editor = current.editor;
            const key = editorKey(editor);
            if (key === shown) return;
            shown = key;
            if (!editor) return hide();
            if (editor.mode === 'create') return show('create', null);
            const note = find(editor.id);
            if (!note) {
                shown = '';
                replace({ section: current.section, editor: null });
                // при запуске по ссылке окно уведомлений ещё не готово: показываем чуть позже
                window.setTimeout(() => toast.info(t('toast.noteMissing')), 300);
                return;
            }
            show(editor.mode, note);
        },
        { immediate: true, flush: 'sync' },
    );
}

export function useEditor() {
    const { route, listSection, go, back, previous, replace } = useRoute();

    /** Раздел под окном: у настроек списка нет, берём последний открытый. */
    const section = () => (route.value.section === 'settings' ? listSection.value : route.value.section);

    function open(editor: EditorRoute): void {
        const current = route.value.editor;
        // из чтения в правку той же заметки — новый шаг (назад вернёт в чтение); заметка за заметкой не копится: окно заменяется
        const fromRead = current?.mode === 'read' && editor.mode !== 'create' && editor.mode !== 'read' && current.id === editor.id;
        go({ section: section(), editor }, !!current && !fromRead);
    }

    return {
        state,
        /** Заметка для чтения: выделять и копировать текст можно, не заходя в правку. */
        openRead: (note: Note) => open({ mode: 'read', id: note.id }),
        openCreate: () => open({ mode: 'create' }),
        openEdit: (note: Note) => open({ mode: 'edit', id: note.id }),
        openClone: (note: Note) => open({ mode: 'clone', id: note.id }),
        /** Закрыть окно: если перед ним был список, шаг назад; иначе (страницу обновили или открыли по ссылке) заменой адреса. */
        close(): void {
            const before = previous();
            if (before && !before.editor && before.section === route.value.section) back();
            else replace({ section: section(), editor: null });
        },
        /** Из правки вернуться в чтение той же заметки: шагом назад, если чтение было перед правкой, иначе заменой. */
        leaveEdit(note: Note): void {
            const before = previous();
            if (before?.editor?.mode === 'read' && before.editor.id === note.id && before.section === route.value.section) back();
            else replace({ section: section(), editor: { mode: 'read', id: note.id } });
        },
        setActive(id: string): void {
            if (state.value) state.value.activeId = id;
        },
    };
}

import { ref } from 'vue';
import type { Note } from '@/core/model';

export type EditorMode = 'create' | 'edit' | 'clone';

export interface EditorState {
    mode: EditorMode;
    /** Заметка, из которой открыли (правка, клон); для новой — `null`. */
    source: Note | null;
    /** Увеличивается при каждом открытии: компонент пересоздаётся с чистым черновиком. */
    key: number;
    /** Какая заметка сейчас в редакторе (для подсветки в списке): у новой появляется после первого сохранения. */
    activeId: string | null;
}

// редактор один на приложение и открывается из карточек, меню и горячих клавиш, поэтому состояние на уровне модуля
const state = ref<EditorState | null>(null);
let counter = 0;

function open(mode: EditorMode, source: Note | null): void {
    state.value = { mode, source, key: ++counter, activeId: mode === 'edit' ? (source?.id ?? null) : null };
}

export function useEditor() {
    return {
        state,
        openCreate: () => open('create', null),
        openEdit: (note: Note) => open('edit', note),
        openClone: (note: Note) => open('clone', note),
        close: () => void (state.value = null),
        setActive(id: string): void {
            if (state.value) state.value.activeId = id;
        },
    };
}

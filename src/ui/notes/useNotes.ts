import { computed, ref } from 'vue';
import { toast } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { useSettingsStore } from '@/app/settings';
import { filterByQuery, isSearchable } from '@/core/search';
import type { Note } from '@/core/model';
import { useI18n } from '@/i18n';

// поиск общий для списка, навигации и тегов, поэтому живёт на уровне модуля
const query = ref('');

export function useSearch() {
    const store = useNotesStore();
    const { settings } = useSettingsStore();
    const searching = computed(() => isSearchable(query.value));
    const found = computed(() => ({
        active: filterByQuery(store.active, query.value, { exact: settings.exactSearch }),
        archive: filterByQuery(store.archive, query.value, { exact: settings.exactSearch }),
    }));
    return { query, searching, found };
}

/** Клик по хештегу ищет по нему; повторный клик по тому же тегу снимает поиск. */
export function toggleTag(tag: string): void {
    const wanted = `#${tag}`;
    query.value = query.value.trim().toLocaleLowerCase() === wanted.toLocaleLowerCase() ? '' : wanted;
}

/** Действия над заметками. Вместо диалогов подтверждения — «Отменить» в уведомлении. */
export function useNoteActions() {
    const store = useNotesStore();
    const { t } = useI18n();

    function withUndo(message: string, action: () => void): void {
        action();
        toast().info().timeout(6000).message(message).action(t('toast.undo'), () => void store.undo());
    }

    return {
        done: (note: Note) => withUndo(t('toast.done'), () => store.setDone(note.id, true)),
        reopen: (note: Note) => withUndo(t('toast.reopened'), () => store.setDone(note.id, false)),
        remove: (note: Note) => withUndo(t('toast.removed'), () => store.remove(note.id)),
        // отметка пункта частая и мелкая: уведомление на каждую было бы шумом, отмена есть на Mod+Z
        toggleItem: (note: Note, itemId: string) => store.toggleItem(note.id, itemId),
    };
}

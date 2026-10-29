<script setup lang="ts">
import { confirm, TaoButton, TaoCard } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { TRASH_DAYS } from '@/core/constants';
import { formatUserDate } from '@/core/date';
import { noteTitle } from '@/core/notes';
import { useI18n } from '@/i18n';
import EmptyState from '@/ui/components/EmptyState.vue';

const { t } = useI18n();
const store = useNotesStore();

async function emptyAll(): Promise<void> {
    const ok = await confirm(t('trash.emptyAll')).ok(t('trash.purge')).cancel(t('ui.button.cancel')).danger();
    if (ok) store.emptyTrash();
}
</script>

<template>
    <EmptyState v-if="store.trash.length === 0" icon="tao-trash" :title="t('trash.empty')" :hint="t('trash.hint', [TRASH_DAYS])" />

    <div v-else class="trash">
        <p class="hint">{{ t('trash.hint', [TRASH_DAYS]) }}</p>

        <TaoCard v-for="note in store.trash" :key="note.id" :shadow="false" class="row">
            <div class="line">
                <div class="text">
                    <span class="title">{{ noteTitle(note, 80) }}</span>
                    <span class="due">{{ formatUserDate(note.due) }}</span>
                </div>
                <div class="actions">
                    <TaoButton variant="ghost" icon="tao-undo" :aria-label="t('trash.restore')" :title="t('trash.restore')" @click="store.restore(note.id)" />
                    <TaoButton variant="ghost" tone="danger" icon="tao-trash" :aria-label="t('trash.purge')" :title="t('trash.purge')" @click="store.purge(note.id)" />
                </div>
            </div>
        </TaoCard>

        <TaoButton variant="ghost" tone="danger" class="empty-all" @click="emptyAll">{{ t('trash.emptyAll') }}</TaoButton>
    </div>
</template>

<style scoped>
.trash {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3);
}

.hint {
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

.line {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--tao-space-3);
}

.text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.title {
    overflow-wrap: anywhere;
}

.due {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-xs);
}

.actions {
    display: flex;
    flex: none;
}

.empty-all {
    align-self: flex-start;
}
</style>

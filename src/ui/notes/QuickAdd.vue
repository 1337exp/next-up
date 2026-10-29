<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEditor } from '@/ui/editor/useEditor';
import { TaoButton, TaoIcon, TaoInput, toast } from '@1337exp/taoui';
import { useNotesStore } from '@/app/notes';
import { diffDays } from '@/core/date';
import { newId } from '@/core/id';
import { parseQuick } from '@/core/quick';
import { dateShort, inDaysText, repeatText, useI18n } from '@/i18n';

/**
 * Быстрый ввод: пишем «завтра позвонить маме #дом», Enter, и заметка уже в списке со сроком.
 * Полная форма — кнопка «Новая заметка». Под полем видно, как понят срок и повтор.
 */
const { t, locale } = useI18n();
const store = useNotesStore();

const editor = useEditor();
const text = ref('');

const parsed = computed(() => parseQuick(text.value, store.today));

function dueLabel(due: string): string {
    const left = diffDays(store.today, due);
    const relative = left === 0 ? t('date.today') : left === 1 ? t('date.tomorrow') : inDaysText(left);
    return left === 0 ? relative : `${relative} · ${dateShort(locale.value, due)}`;
}

// подсказка только когда в тексте нашлось что-то про срок или повтор: иначе заметка просто «на сегодня»
const preview = computed(() => {
    const result = parsed.value;
    if (text.value.trim() === '' || (!result.foundDue && !result.foundRepeat)) return '';
    const parts = [dueLabel(result.due)];
    if (result.repeat) parts.push(repeatText(result.repeat));
    return parts.join(' · ');
});

function submit(): void {
    const result = parsed.value;
    if (text.value.trim() === '') return;

    const added = store.add({ due: result.due, body: result.body, items: [], repeat: result.repeat }, newId());
    if (!added.ok) {
        toast.warning(t(added.error === 'empty' ? 'editor.error.empty' : 'storage.saveFailed'));
        return;
    }
    text.value = '';
    toast().info().timeout(6000).message(t('quick.added', [dueLabel(result.due)])).action(t('toast.undo'), () => void store.undo());
}
</script>

<template>
    <form class="quick" @submit.prevent="submit">
        <TaoInput v-model="text" class="field" :placeholder="t('quick.placeholder')" :aria-label="t('quick.label')" :aria-describedby="preview ? 'quick-preview' : undefined" autocomplete="off" size="large">
            <template #prefix>
                <TaoButton variant="text" icon="tao-edit" class="full" :aria-label="t('quick.full')" @click="editor.openCreate()" />
            </template>
            <template #suffix>
                <kbd v-if="text.trim() !== ''" class="nu-kbd" aria-hidden="true">Enter</kbd>
                <TaoButton type="submit" variant="primary" icon="tao-plus" :aria-label="t('quick.add')" :disabled="text.trim() === ''" />
            </template>
        </TaoInput>
        <p v-if="preview" id="quick-preview" class="preview" aria-live="polite"><TaoIcon name="tao-calendar" />{{ preview }}</p>
    </form>
</template>

<style scoped>
.quick {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-1);
}

@media (max-width: 599px) {
    /* поле уходит в конец ленты и липнет над нижней панелью, под большим пальцем */
    .quick {
        position: sticky;
        bottom: calc(var(--nu-bar-h) + env(safe-area-inset-bottom));
        z-index: 2;
        order: 99;
        margin-inline: calc(var(--tao-space-4) * -1);
        padding: var(--tao-space-2) var(--tao-space-4);
        /* фон у самого поля: между ним и плашкой лента просвечивает */
        background: transparent;
    }

    .field {
        border-radius: var(--tao-radius-full);
        background: var(--tao-color-surface-raised);
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
    }
}

.preview {
    display: flex;
    gap: var(--tao-space-2);
    align-items: center;
    margin: 0;
    padding-inline: var(--tao-space-2);
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}
</style>

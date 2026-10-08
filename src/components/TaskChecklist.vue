<script setup lang="ts">
import { ref } from 'vue';
import { confirm, TaoCheckbox } from '@1337exp/taoui';
import type { ChecklistItem } from '@/domain/types';
import { formatDateTime, useI18n } from '@/i18n';

const props = defineProps<{
    items: readonly ChecklistItem[];
    disabled?: boolean;
    /** Просить подтверждение, когда с пункта снимают отметку (снятие стирает время отметки). */
    confirmUncheck?: boolean;
}>();
const emit = defineEmits<{ toggle: [index: number] }>();

const { t, locale } = useI18n();

// Если пользователь отказался, нативный чекбокс уже переключился, а состояние пункта не изменилось,
// и Vue ничего не перерисует. Смена ключа пересоздаёт чекбоксы и возвращает их в исходное положение.
const revision = ref(0);

async function onToggle(index: number): Promise<void> {
    const item = props.items[index];
    if (!item) return;

    if (item.done && props.confirmUncheck) {
        const ok = await confirm(t('tasks.notify.uncheck.title'))
            .message(t('tasks.notify.uncheck.message', [item.text]))
            .ok(t('ui.confirm.yes'))
            .cancel(t('ui.confirm.no'))
            .danger();

        if (!ok) {
            revision.value++;
            return;
        }
    }

    emit('toggle', index);
}
</script>

<template>
    <ul class="checklist">
        <li v-for="(item, index) in items" :key="`${revision}-${index}`" class="item">
            <TaoCheckbox :model-value="item.done" :label="item.text" :disabled="disabled" @update:model-value="onToggle(index)" />
            <div v-if="item.done && item.changedAt" class="changed">{{ formatDateTime(item.changedAt, locale) }}</div>
        </li>
    </ul>
</template>

<style scoped>
.checklist {
    margin: 0;
    padding: 0;
    list-style: none;
}

.item {
    min-height: calc(40px * var(--nextup-ui-scale, 1));
}

/* подпись рисует сам TaoCheckbox со своим размером, поэтому масштабируем её, а не <li> */
.item :deep(.tao-checkbox__label) {
    font-size: calc(var(--tao-font-size-sm) * var(--nextup-item-scale, 1));
}

.changed {
    margin: 2px 0 var(--tao-space-3, 12px) 28px;
    font-size: calc(10px * var(--nextup-item-scale, 1) * var(--nextup-ui-scale, 1));
    color: var(--tao-color-text-subtle);
}
</style>

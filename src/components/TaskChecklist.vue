<script setup lang="ts">
import { TaoCheckbox } from '@1337exp/taoui';
import type { ChecklistItem } from '@/domain/types';
import { formatDateTime, useI18n } from '@/i18n';

defineProps<{ items: readonly ChecklistItem[]; disabled?: boolean }>();
const emit = defineEmits<{ toggle: [index: number] }>();

const { locale } = useI18n();
</script>

<template>
    <ul class="checklist">
        <li v-for="(item, index) in items" :key="index" class="item">
            <TaoCheckbox :model-value="item.done" :label="item.text" :disabled="disabled" @update:model-value="emit('toggle', index)" />
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
    min-height: 40px;
    font-size: var(--tao-font-size-sm);
}

.changed {
    margin: 2px 0 var(--tao-space-3, 12px) 28px;
    font-size: 10px;
    color: var(--tao-color-text-subtle);
}
</style>

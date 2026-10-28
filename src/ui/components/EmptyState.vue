<script setup lang="ts">
import { TaoEmpty, TaoIcon } from '@1337exp/taoui';

defineProps<{
    title: string;
    /** Имя иконки (встроенной `tao-*` или из `registerAppIcons`). */
    icon: string;
    /** Пояснение под заголовком. */
    hint?: string;
}>();
</script>

<template>
    <TaoEmpty :title="title" class="empty">
        <template #icon><TaoIcon :name="icon" class="icon" /></template>
        <template v-if="hint || $slots.default" #default>{{ hint }}<slot /></template>
        <template v-if="$slots.action" #action><slot name="action" /></template>
    </TaoEmpty>
</template>

<style scoped>
.empty {
    margin-block: var(--tao-space-8);
}

.icon {
    font-size: 2.5rem;
    color: var(--tao-color-text-muted);
}
</style>

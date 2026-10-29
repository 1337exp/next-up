<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { TaoButton, TaoIcon, TaoInput } from '@1337exp/taoui';
import { useI18n } from '@/i18n';
import { useSearch } from './useNotes';

const props = defineProps<{ autofocus?: boolean }>();

const { t } = useI18n();
const { query } = useSearch();
const root = ref<HTMLElement | null>(null);

onMounted(() => {
    if (props.autofocus) root.value?.querySelector('input')?.focus();
});

// Esc: сначала очищает запрос, повторный — уводит фокус из поля
function onEscape(event: KeyboardEvent): void {
    if (query.value) query.value = '';
    else (event.target as HTMLElement).blur();
}
</script>

<template>
    <div ref="root" class="search" data-search>
        <TaoInput v-model="query" class="field" :placeholder="t('search.placeholder')" :aria-label="t('search.placeholder')" @keydown.esc="onEscape">
            <template #prefix><TaoIcon name="tao-search" /></template>
            <template #suffix>
                <TaoButton v-if="query" variant="text" icon="tao-close" :aria-label="t('search.clear')" @click="query = ''" />
                <kbd v-else class="nu-kbd" aria-hidden="true">/</kbd>
            </template>
        </TaoInput>
    </div>
</template>

<style scoped>
.search {
    display: flex;
    align-items: center;
}

.field {
    flex: 1;
    min-width: 0;
}
</style>

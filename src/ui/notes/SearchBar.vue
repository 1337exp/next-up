<script setup lang="ts">
import { TaoButton, TaoCheckbox, TaoIcon, TaoInput, TaoPopover } from '@1337exp/taoui';
import { useI18n } from '@/i18n';
import { useSearch } from './useNotes';

const { t } = useI18n();
const { query, exact } = useSearch();
</script>

<template>
    <div class="search" data-search>
        <TaoInput v-model="query" class="field" :placeholder="t('search.placeholder')" :aria-label="t('search.placeholder')" @keydown.esc="query = ''">
            <template #prefix><TaoIcon name="tao-search" /></template>
            <template #suffix>
                <TaoButton v-if="query" variant="text" icon="tao-close" :aria-label="t('search.clear')" @click="query = ''" />
            </template>
        </TaoInput>

        <TaoPopover placement="bottom-end">
            <template #trigger>
                <TaoButton variant="ghost" icon="tao-settings" :aria-label="t('search.filters')" :pressed="exact" />
            </template>
            <TaoCheckbox v-model="exact" :label="t('search.exact')" />
        </TaoPopover>
    </div>
</template>

<style scoped>
.search {
    display: flex;
    align-items: center;
    gap: var(--tao-space-2);
}

.field {
    flex: 1;
    min-width: 0;
}
</style>

<script setup lang="ts">
import { TaoSegmented, TaoSegmentedOption } from '@1337exp/taoui';
import { isLocaleCode, LOCALE_CODES, LOCALE_NAMES, useI18n, type LocaleCode } from '@/i18n';

defineProps<{ modelValue: LocaleCode }>();
const emit = defineEmits<{ 'update:modelValue': [code: LocaleCode] }>();

const { t } = useI18n();

function onUpdate(value: unknown): void {
    if (isLocaleCode(value)) emit('update:modelValue', value);
}
</script>

<template>
    <TaoSegmented :model-value="modelValue" :legend="t('language.title')" block @update:model-value="onUpdate">
        <TaoSegmentedOption v-for="code in LOCALE_CODES" :key="code" :value="code">
            {{ LOCALE_NAMES[code] }}
        </TaoSegmentedOption>
    </TaoSegmented>
</template>

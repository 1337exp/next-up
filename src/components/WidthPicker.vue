<script setup lang="ts">
import { TaoSegmented, TaoSegmentedOption } from '@1337exp/taoui';
import { isWidthMode, WIDTH_MODES, type WidthMode } from '@/domain/settings';
import { useI18n } from '@/i18n';

defineProps<{ modelValue: WidthMode }>();
const emit = defineEmits<{ 'update:modelValue': [mode: WidthMode] }>();

const { t } = useI18n();

function onUpdate(value: unknown): void {
    if (isWidthMode(value)) emit('update:modelValue', value);
}
</script>

<template>
    <TaoSegmented :model-value="modelValue" :legend="t('settings.width.title')" block @update:model-value="onUpdate">
        <TaoSegmentedOption v-for="mode in WIDTH_MODES" :key="mode" :value="mode">
            {{ t(`settings.width.${mode}`) }}
        </TaoSegmentedOption>
    </TaoSegmented>
</template>

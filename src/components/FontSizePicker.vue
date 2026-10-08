<script setup lang="ts">
import { TaoSegmented, TaoSegmentedOption } from '@1337exp/taoui';
import { FONT_SCALES, isFontScale, type FontScale } from '@/domain/settings';

defineProps<{ modelValue: FontScale; label: string }>();
const emit = defineEmits<{ 'update:modelValue': [scale: FontScale] }>();

function onUpdate(value: unknown): void {
    const scale = Number(value);
    if (isFontScale(scale)) emit('update:modelValue', scale);
}
</script>

<template>
    <TaoSegmented :model-value="modelValue" :aria-label="label" block @update:model-value="onUpdate">
        <TaoSegmentedOption v-for="scale in FONT_SCALES" :key="scale" :value="scale">{{ scale }}%</TaoSegmentedOption>
    </TaoSegmented>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from 'vue';
import { TaoButton } from '@1337exp/taoui';
import { LOCALE_CODES, LOCALE_NAMES, useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const { t } = useI18n();
const settings = useSettingsStore();
const list = useTemplateRef<HTMLElement>('list');

// Фокус на предложенном языке (по языку браузера): достаточно нажать Enter.
onMounted(() => {
    list.value?.querySelector<HTMLElement>('[data-suggested]')?.focus();
});
</script>

<template>
    <main class="gate">
        <h1 class="title">Язык · Language</h1>

        <div ref="list" class="choices">
            <TaoButton
                v-for="code in LOCALE_CODES"
                :key="code"
                :variant="code === settings.effectiveLocale ? 'primary' : 'secondary'"
                :data-suggested="code === settings.effectiveLocale ? '' : undefined"
                :lang="code"
                @click="settings.setLocale(code)"
            >
                {{ LOCALE_NAMES[code] }}
            </TaoButton>
        </div>

        <p class="hint">{{ t('language.hint') }}</p>
    </main>
</template>

<style scoped>
.gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--tao-space-4, 16px);
    min-height: 100%;
    padding: var(--tao-space-4, 16px);
    box-sizing: border-box;
}

.title {
    margin: 0;
    font-size: var(--tao-font-size-3xl);
    font-weight: 500;
    color: var(--tao-color-text-strong);
}

.choices {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--tao-space-3, 12px);
}

.hint {
    margin: 0;
    color: var(--tao-color-text-subtle);
    font-size: var(--tao-font-size-sm);
    text-align: center;
}
</style>

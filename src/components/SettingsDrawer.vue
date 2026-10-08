<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { TaoDrawer, TaoFormField, TaoInput, TaoSwitch } from '@1337exp/taoui';
import DataSection from '@/components/DataSection.vue';
import LanguagePicker from '@/components/LanguagePicker.vue';
import WidthPicker from '@/components/WidthPicker.vue';
import { FAR_TASK_DAYS } from '@/domain/constants';
import { FEATURES } from '@/features';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const settings = useSettingsStore();

// Адрес синхронизации: поле скрыто, пока синхронизации нет (FEATURES.sync)
const endpoint = ref(settings.syncEndpoint);
const endpointInvalid = ref(false);

function applyEndpoint(): void {
    endpointInvalid.value = !settings.setSyncEndpoint(endpoint.value);
    if (!endpointInvalid.value) endpoint.value = settings.syncEndpoint;
}

// Инструменты разработчика: в рабочей сборке условие превращается в `null`, и модуль не включается в бандл.
const DevTools = import.meta.env.DEV ? defineAsyncComponent(() => import('@/dev/DevTools.vue')) : null;
</script>

<template>
    <TaoDrawer v-model="open" :title="t('settings.title')" :close-label="t('ui.button.close')">
        <section class="section">
            <h2 class="section-title">{{ t('language.title') }}</h2>
            <LanguagePicker :model-value="settings.effectiveLocale" @update:model-value="settings.setLocale" />
        </section>

        <section class="section">
            <h2 class="section-title">{{ t('settings.width.title') }}</h2>
            <WidthPicker :model-value="settings.widthMode" @update:model-value="settings.setWidthMode" />
            <p class="hint">{{ t('settings.width.hint') }}</p>
        </section>

        <section class="section">
            <div class="switches">
                <TaoSwitch :model-value="settings.hideFarTasks" :label="t('settings.autoHide', [FAR_TASK_DAYS])" @update:model-value="settings.setHideFarTasks" />
                <TaoSwitch :model-value="settings.confirmUncheck" :label="t('settings.confirmUncheck')" @update:model-value="settings.setConfirmUncheck" />
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">{{ t('settings.data.title') }}</h2>
            <DataSection />
        </section>

        <section v-if="FEATURES.sync" class="section">
            <h2 class="section-title">{{ t('settings.sync.title') }}</h2>
            <TaoFormField :error="endpointInvalid ? t('settings.sync.invalid') : ''">
                <TaoInput v-model="endpoint" :placeholder="t('settings.sync.placeholder')" :error="endpointInvalid" @blur="applyEndpoint" />
            </TaoFormField>
        </section>

        <section v-if="DevTools" class="section">
            <component :is="DevTools" />
        </section>
    </TaoDrawer>
</template>

<style scoped>
.section + .section {
    margin-top: var(--tao-space-5, 20px);
}

.section-title {
    margin: 0 0 var(--tao-space-2, 8px);
    font-size: var(--tao-font-size-md);
    font-weight: 500;
    color: var(--tao-color-text-strong);
}

.switches {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3, 12px);
}

.hint {
    margin: var(--tao-space-2, 8px) 0 0;
    font-size: var(--tao-font-size-sm);
    color: var(--tao-color-text-subtle);
}
</style>

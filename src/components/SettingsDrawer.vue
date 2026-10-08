<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { TaoDrawer, TaoSpoiler, TaoSwitch, toast } from '@1337exp/taoui';
import DataSection from '@/components/DataSection.vue';
import SyncSection from '@/components/SyncSection.vue';
import FontSizePicker from '@/components/FontSizePicker.vue';
import LanguagePicker from '@/components/LanguagePicker.vue';
import WidthPicker from '@/components/WidthPicker.vue';
import { FAR_TASK_DAYS } from '@/domain/constants';
import { detectDevMode } from '@/dev/mode';
import { notifySupport, requestNotifications } from '@/lib/notifications';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';

const open = defineModel<boolean>({ required: true });

const { t } = useI18n();
const settings = useSettingsStore();

// Оповещения: состояние берём при каждом открытии настроек (разрешение могли изменить в самом браузере)
const notifyState = computed(() => (open.value ? notifySupport() : 'default'));
const notifyHint = computed(() => {
    if (notifyState.value === 'unsupported') return t('settings.notify.unsupported');
    if (notifyState.value === 'denied') return t('settings.notify.denied');
    return t('settings.notify.hint');
});

// разрешение просим только по действию пользователя; не дали — переключатель остаётся выключенным
async function onNotifyToggle(value: boolean): Promise<void> {
    if (!value) return settings.setNotifyToday(false);
    const result = await requestNotifications();
    settings.setNotifyToday(result === 'granted');
    if (result !== 'granted') toast.warning(t(result === 'denied' ? 'settings.notify.denied' : 'settings.notify.unsupported'));
}

// Инструменты разработчика: отдельный чанк, который грузится, только когда режим разработки включён
// (заход по IP / localhost, сборка для разработки или флаг `nextup-dev=1` в localStorage; см. dev/mode.ts).
// Проверяем при каждом открытии настроек, поэтому флаг работает без перезагрузки.
const DevTools = defineAsyncComponent(() => import('@/dev/DevTools.vue'));
const devMode = computed(() => open.value && detectDevMode());
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
            <h2 class="section-title">{{ t('settings.uiScale.title') }}</h2>
            <FontSizePicker :model-value="settings.uiScale" :label="t('settings.uiScale.title')" @update:model-value="settings.setUiScale" />
            <p class="hint">{{ t('settings.uiScale.hint') }}</p>

            <!-- тонкая настройка нужна немногим: спрятана под спойлер -->
            <TaoSpoiler class="fine-tune" :title="t('settings.fontSize.title')">
                <div class="font-rows">
                    <div>
                        <p class="row-label">{{ t('settings.fontSize.header') }}</p>
                        <FontSizePicker :model-value="settings.headerScale" :label="t('settings.fontSize.header')" @update:model-value="settings.setHeaderScale" />
                    </div>
                    <div>
                        <p class="row-label">{{ t('settings.fontSize.note') }}</p>
                        <FontSizePicker :model-value="settings.noteScale" :label="t('settings.fontSize.note')" @update:model-value="settings.setNoteScale" />
                    </div>
                    <div>
                        <p class="row-label">{{ t('settings.fontSize.items') }}</p>
                        <FontSizePicker :model-value="settings.itemScale" :label="t('settings.fontSize.items')" @update:model-value="settings.setItemScale" />
                    </div>
                </div>
            </TaoSpoiler>
        </section>

        <section class="section">
            <div class="switches">
                <TaoSwitch :model-value="settings.hideFarTasks" :label="t('settings.autoHide', [FAR_TASK_DAYS])" @update:model-value="settings.setHideFarTasks" />
                <TaoSwitch :model-value="settings.confirmUncheck" :label="t('settings.confirmUncheck')" @update:model-value="settings.setConfirmUncheck" />
                <div>
                    <TaoSwitch
                        :model-value="settings.notifyToday"
                        :disabled="notifyState === 'unsupported' || notifyState === 'denied'"
                        :label="t('settings.notify.label')"
                        @update:model-value="onNotifyToggle"
                    />
                    <p class="hint">{{ notifyHint }}</p>
                </div>
            </div>
        </section>

        <section class="section">
            <h2 class="section-title">{{ t('settings.data.title') }}</h2>
            <DataSection />
        </section>

        <section class="section">
            <h2 class="section-title">{{ t('settings.sync.title') }}</h2>
            <SyncSection />
        </section>

        <section v-if="devMode" class="section">
            <div style="height: 30px;"></div>
            <div style="opacity: 0.4">
                <component :is="DevTools" />
            </div>
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

.fine-tune {
    margin-top: var(--tao-space-3, 12px);
}

.font-rows {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3, 12px);
}

.row-label {
    margin: 0 0 var(--tao-space-1, 4px);
    font-size: var(--tao-font-size-sm);
    color: var(--tao-color-text-subtle);
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

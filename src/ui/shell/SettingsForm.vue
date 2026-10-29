<script setup lang="ts">
import { computed, ref } from 'vue';
import { confirm, TaoButton, TaoDivider, TaoFormField, TaoSegmented, TaoSegmentedOption, TaoSelect, TaoSwitch, taoPalettes } from '@1337exp/taoui';
import { buildDemoNotes } from '@/app/demo';
import { notifySupport, requestNotifications, showTodayNotice, type NotifySupport } from '@/app/notify';
import { isDevMode } from '@/app/dev';
import { useNotesStore } from '@/app/notes';
import { MODES, SIZES, useSettingsStore, type Mode, type Size } from '@/app/settings';
import { i18n, LOCALE_NAMES, setLocale, useI18n, type LocaleCode } from '@/i18n';
import DataSection from './DataSection.vue';
import SyncSection from './SyncSection.vue';

/** Содержимое настроек: страница-раздел на ПК и планшете, нижний лист на телефоне. */
const { t } = useI18n();
const { settings } = useSettingsStore();
const notes = useNotesStore();

const DEFAULT_PALETTE = 'default';
const palettes = computed(() => [{ value: DEFAULT_PALETTE, label: t('settings.palette.default') }, ...taoPalettes.map((p) => ({ value: p.name, label: p.label }))]);
const palette = computed({
    get: () => settings.palette || DEFAULT_PALETTE,
    set: (value: string | number | null) => (settings.palette = value === DEFAULT_PALETTE || value === null ? '' : String(value)),
});

const dev = isDevMode();

// --- оповещения: разрешение просим по клику на переключатель, иначе браузер его не покажет ---
const support = ref<NotifySupport>(notifySupport());
const asking = ref(false);
const notifyHint = computed(() => (support.value === 'unsupported' ? t('settings.notify.unsupported') : support.value === 'denied' ? t('settings.notify.denied') : t('settings.notify.hint')));

async function onNotify(on: boolean): Promise<void> {
    if (!on) {
        settings.notifyToday = false;
        return;
    }
    asking.value = true;
    support.value = await requestNotifications();
    asking.value = false;
    settings.notifyToday = support.value === 'granted';
}

async function fillDemo(): Promise<void> {
    const ok = await confirm(t('settings.dev.demo')).message(t('settings.dev.demoConfirm')).ok(t('settings.dev.replace')).cancel(t('ui.button.cancel')).danger();
    if (ok) notes.replaceAll(buildDemoNotes(notes.today, Date.now()));
}
</script>

<template>
    <div class="settings">
        <h3 class="tao-heading-6 group">{{ t('settings.appearance') }}</h3>

        <TaoFormField :label="t('settings.language')">
            <TaoSegmented :model-value="i18n.current.value" @update:model-value="setLocale($event as LocaleCode)">
                <TaoSegmentedOption v-for="code in i18n.codes" :key="code" :value="code" :label="LOCALE_NAMES[code]" />
            </TaoSegmented>
        </TaoFormField>

        <TaoFormField :label="t('settings.mode.title')">
            <TaoSegmented v-model="settings.mode" @update:model-value="settings.mode = $event as Mode">
                <TaoSegmentedOption v-for="mode in MODES" :key="mode" :value="mode" :label="t(`settings.mode.${mode}`)" />
            </TaoSegmented>
        </TaoFormField>

        <TaoFormField :label="t('settings.palette.title')">
            <TaoSelect v-model="palette" :options="palettes" :clearable="false" />
        </TaoFormField>

        <TaoFormField :label="t('settings.size.title')">
            <TaoSegmented v-model="settings.size" @update:model-value="settings.size = $event as Size">
                <TaoSegmentedOption v-for="size in SIZES" :key="size" :value="size" :label="t(`settings.size.${size}`)" />
            </TaoSegmented>
        </TaoFormField>

        <TaoDivider />

        <h3 class="tao-heading-6 group">{{ t('settings.gesturesGroup') }}</h3>

        <div class="notify">
            <TaoSwitch v-model="settings.fullSwipe" :label="t('settings.fullSwipe.label')" />
            <p class="hint">{{ t('settings.fullSwipe.hint') }}</p>
        </div>

        <TaoDivider />

        <h3 class="tao-heading-6 group">{{ t('settings.searchGroup') }}</h3>

        <div class="notify">
            <TaoSwitch v-model="settings.exactSearch" :label="t('settings.exactSearch.label')" />
            <p class="hint">{{ t('settings.exactSearch.hint') }}</p>
        </div>

        <TaoDivider />

        <h3 class="tao-heading-6 group">{{ t('settings.notifications') }}</h3>

        <div class="notify">
            <TaoSwitch :model-value="settings.notifyToday" :label="t('settings.notify.label')" :loading="asking" :disabled="support === 'unsupported' || support === 'denied'" @update:model-value="onNotify" />
            <p class="hint">{{ notifyHint }}</p>
        </div>

        <SyncSection />

        <TaoDivider />

        <DataSection />

        <TaoDivider v-if="dev" />

        <section v-if="dev" class="dev">
            <h3 class="tao-heading-6">{{ t('settings.dev.title') }}</h3>
            <div class="dev-buttons">
                <TaoButton variant="secondary" @click="fillDemo">{{ t('settings.dev.demo') }}</TaoButton>
                <TaoButton variant="secondary" @click="showTodayNotice">{{ t('settings.dev.notice') }}</TaoButton>
            </div>
        </section>

    </div>
</template>

<style scoped>
.settings {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-5);
}

.group {
    margin: 0;
}

.notify {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-1);
}

.hint {
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

.dev-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
}

.dev {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2);
}
</style>

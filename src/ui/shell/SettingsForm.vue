<script setup lang="ts">
import { computed, ref } from 'vue';
import { confirm, TaoButton, TaoSegmented, TaoSegmentedOption, TaoSelect, TaoSwitch, taoPalettes } from '@1337exp/taoui';
import { buildDemoNotes } from '@/app/demo';
import { notifySupport, requestNotifications, showTodayNotice, type NotifySupport } from '@/app/notify';
import { isDevMode } from '@/app/dev';
import { useNotesStore } from '@/app/notes';
import { MODES, useSettingsStore, type Mode } from '@/app/settings';
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
        <section class="nu-sec">
            <h3 class="nu-sec-title">{{ t('settings.appearance') }}</h3>
            <div class="nu-card">
                <div class="nu-row">
                    <span>{{ t('settings.language') }}</span>
                    <TaoSegmented :model-value="i18n.current.value" role="group" :aria-label="t('settings.language')" @update:model-value="setLocale($event as LocaleCode)">
                        <TaoSegmentedOption v-for="code in i18n.codes" :key="code" :value="code" :label="LOCALE_NAMES[code]" />
                    </TaoSegmented>
                </div>
                <div class="nu-row">
                    <span>{{ t('settings.mode.title') }}</span>
                    <TaoSegmented v-model="settings.mode" role="group" :aria-label="t('settings.mode.title')" @update:model-value="settings.mode = $event as Mode">
                        <TaoSegmentedOption v-for="mode in MODES" :key="mode" :value="mode" :label="t(`settings.mode.${mode}`)" />
                    </TaoSegmented>
                </div>
                <div class="nu-row">
                    <span>{{ t('settings.palette.title') }}</span>
                    <TaoSelect v-model="palette" class="palette" :options="palettes" :clearable="false" :aria-label="t('settings.palette.title')" />
                </div>
            </div>
        </section>

        <section class="nu-sec">
            <h3 class="nu-sec-title">{{ t('settings.listGroup') }}</h3>
            <div class="nu-card">
                <div class="nu-row">
                    <TaoSwitch v-model="settings.showWeek" class="nu-switch" :label="t('settings.showWeek')" />
                </div>
                <div class="nu-row nu-row--col">
                    <TaoSwitch v-model="settings.fullSwipe" class="nu-switch" :label="t('settings.fullSwipe.label')" />
                    <p class="nu-hint">{{ t('settings.fullSwipe.hint') }}</p>
                </div>
                <div class="nu-row nu-row--col">
                    <TaoSwitch v-model="settings.exactSearch" class="nu-switch" :label="t('settings.exactSearch.label')" />
                    <p class="nu-hint">{{ t('settings.exactSearch.hint') }}</p>
                </div>
            </div>
        </section>

        <section class="nu-sec">
            <h3 class="nu-sec-title">{{ t('settings.notifications') }}</h3>
            <div class="nu-card">
                <div class="nu-row nu-row--col">
                    <TaoSwitch :model-value="settings.notifyToday" class="nu-switch" :label="t('settings.notify.label')" :loading="asking" :disabled="support === 'unsupported' || support === 'denied'" @update:model-value="onNotify" />
                    <p class="nu-hint">{{ notifyHint }}</p>
                </div>
            </div>
        </section>

        <SyncSection />

        <DataSection />

        <section v-if="dev" class="nu-sec">
            <h3 class="nu-sec-title">{{ t('settings.dev.title') }}</h3>
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
    gap: var(--tao-space-6);
}

.palette {
    flex: 0 1 11rem;
    min-width: 8rem;
}

.dev-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
}
</style>

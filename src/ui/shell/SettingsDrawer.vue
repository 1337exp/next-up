<script setup lang="ts">
import { computed } from 'vue';
import { confirm, TaoButton, TaoDrawer, TaoFormField, TaoSegmented, TaoSegmentedOption, TaoSelect, TaoSwitch, taoPalettes } from '@1337exp/taoui';
import { buildDemoNotes } from '@/app/demo';
import { isDevMode } from '@/app/dev';
import { useNotesStore } from '@/app/notes';
import { MODES, SIZES, useSettingsStore, type Mode, type Size } from '@/app/settings';
import { FAR_DAYS } from '@/core/constants';
import DataSection from './DataSection.vue';
import { usePhone } from './useWide';
import { i18n, LOCALE_NAMES, setLocale, useI18n, type LocaleCode } from '@/i18n';

const open = defineModel<boolean>({ required: true });

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
// на телефоне настройки выезжают нижним листом, на остальных — справа
const phone = usePhone();

async function fillDemo(): Promise<void> {
    const ok = await confirm(t('settings.dev.demo')).message(t('settings.dev.demoConfirm')).ok(t('settings.dev.replace')).cancel(t('ui.button.cancel')).danger();
    if (ok) notes.replaceAll(buildDemoNotes(notes.today, Date.now()));
}
</script>

<template>
    <TaoDrawer v-model="open" :side="phone ? 'bottom' : 'right'" :title="t('settings.title')">
        <div class="settings">
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

            <TaoSwitch v-model="settings.hideFar" :label="t('settings.hideFar', [FAR_DAYS])" />

            <DataSection />

            <section v-if="dev" class="dev">
                <h3 class="tao-heading-6">{{ t('settings.dev.title') }}</h3>
                <TaoButton variant="secondary" @click="fillDemo">{{ t('settings.dev.demo') }}</TaoButton>
            </section>
        </div>
    </TaoDrawer>
</template>

<style scoped>
.settings {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-5);
}

.dev {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';
import { TaoButton, TaoFormField, TaoInput, TaoSwitch, toast } from '@1337exp/taoui';
import { useSettingsStore } from '@/app/settings';
import { useSyncStore } from '@/app/sync';
import { normalizeEndpoint } from '@/app/syncHttp';
import { formatDateTime, useI18n } from '@/i18n';

const { t, locale } = useI18n();
const { settings } = useSettingsStore();
const sync = useSyncStore();

const urlInvalid = computed(() => settings.sync.url.trim() !== '' && normalizeEndpoint(settings.sync.url) === null);
const canEnable = computed(() => normalizeEndpoint(settings.sync.url) !== null);

// одна строка состояния: ошибка важнее, потом сеть, потом «когда последний раз»
const statusText = computed(() => {
    if (sync.status === 'error' && sync.failure) return t(`sync.error.${sync.failure}`);
    const base = t(`sync.status.${sync.status}`);
    return sync.status === 'idle' && sync.lastSyncedAt ? `${base} ${t('sync.lastAt', [formatDateTime(sync.lastSyncedAt, locale.value)])}` : base;
});

async function syncNow(): Promise<void> {
    const result = await sync.syncNow();
    if (result?.ok) toast.success(t('sync.done'));
    else if (result) toast.danger(t(`sync.error.${result.error}`));
}
</script>

<template>
    <section class="sync">
        <h3 class="tao-heading-6">{{ t('sync.title') }}</h3>

        <TaoFormField :label="t('sync.url')" :hint="t('sync.urlHint')" :error="urlInvalid ? t('sync.urlInvalid') : ''">
            <TaoInput v-model="settings.sync.url" type="text" placeholder="https://…" :error="urlInvalid" autocomplete="off" spellcheck="false" />
        </TaoFormField>

        <TaoFormField :label="t('sync.authorization')" :hint="t('sync.authorizationHint')">
            <TaoInput v-model="settings.sync.authorization" type="password" autocomplete="off" />
        </TaoFormField>

        <TaoSwitch v-model="settings.sync.enabled" :label="t('sync.enable')" :disabled="!canEnable && !settings.sync.enabled" :loading="sync.status === 'syncing'" />

        <p class="status" :class="{ 'status--error': sync.status === 'error' }" role="status">{{ statusText }}</p>

        <TaoButton variant="secondary" :disabled="sync.status === 'off' || sync.status === 'syncing' || sync.status === 'offline'" @click="syncNow">{{ t('sync.now') }}</TaoButton>
    </section>
</template>

<style scoped>
.sync {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--tao-space-3);
}

.sync > :deep(.tao-form-field) {
    align-self: stretch;
}

.sync h3 {
    margin: 0;
}

.status {
    margin: 0;
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

.status--error {
    color: var(--tao-color-danger);
}
</style>

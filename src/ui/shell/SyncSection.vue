<script setup lang="ts">
import { computed } from 'vue';
import { TaoButton, TaoFormField, TaoIcon, TaoInput, TaoSwitch, toast } from '@1337exp/taoui';
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
    <section class="nu-sec">
        <h3 class="nu-sec-title">{{ t('sync.title') }}</h3>

        <!-- свёрнуто, пока синхронизация не настроена: поля нужны один раз -->
        <details class="nu-card sync" :open="settings.sync.enabled || settings.sync.url !== ''">
            <summary class="nu-row summary">
                <span class="summary-text">
                    <span>{{ t('sync.enable') }}</span>
                    <span class="status" :class="{ 'status--error': sync.status === 'error' }" role="status">{{ statusText }}</span>
                </span>
                <TaoIcon name="tao-chevron-down" class="chevron" />
            </summary>

            <div class="fields">
                <TaoFormField :label="t('sync.url')" :hint="t('sync.urlHint')" :error="urlInvalid ? t('sync.urlInvalid') : ''">
                    <TaoInput v-model="settings.sync.url" type="text" placeholder="https://…" :error="urlInvalid" autocomplete="off" spellcheck="false" />
                </TaoFormField>

                <TaoFormField :label="t('sync.authorization')" :hint="t('sync.authorizationHint')">
                    <TaoInput v-model="settings.sync.authorization" type="password" autocomplete="off" />
                </TaoFormField>

                <TaoSwitch v-model="settings.sync.enabled" :label="t('sync.enable')" :disabled="!canEnable && !settings.sync.enabled" :loading="sync.status === 'syncing'" />

                <TaoButton variant="secondary" class="now" :disabled="sync.status === 'off' || sync.status === 'syncing' || sync.status === 'offline'" @click="syncNow">{{ t('sync.now') }}</TaoButton>
            </div>
        </details>
    </section>
</template>

<style scoped>
.summary {
    cursor: pointer;
    list-style: none;
}

.summary::-webkit-details-marker {
    display: none;
}

.summary-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
}

.chevron {
    color: var(--tao-color-text-muted);
    transition: transform 0.16s ease;
}

.sync[open] .chevron {
    transform: rotate(180deg);
}

@media (prefers-reduced-motion: reduce) {
    .chevron {
        transition: none;
    }
}

.fields {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3);
    padding: var(--tao-space-3);
    border-top: 1px solid var(--tao-color-border);
}

.now {
    align-self: flex-start;
}

.status {
    color: var(--tao-color-text-muted);
    font-size: var(--tao-font-size-sm);
}

.status--error {
    color: var(--tao-color-danger-text);
}
</style>

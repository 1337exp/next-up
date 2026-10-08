<script setup lang="ts">
import { computed, ref } from 'vue';
import { confirm, TaoButton, TaoFormField, TaoIcon, TaoInput, toast } from '@1337exp/taoui';
import { useCloudSync } from '@/composables/cloudSync';
import { useI18n } from '@/i18n';
import { useSettingsStore } from '@/stores/settings';
import { useSyncStore } from '@/stores/sync';
import type { SyncFailure } from '@/sync/types';

const { t, locale } = useI18n();
const settings = useSettingsStore();
const sync = useSyncStore();
const cloud = useCloudSync();

// адрес вебхука; токен — его часть, поэтому после ввода адрес сохраняется только допустимым (https или localhost)
const endpoint = ref(settings.syncEndpoint);
const endpointInvalid = ref(false);

function applyEndpoint(): void {
    endpointInvalid.value = !settings.setSyncEndpoint(endpoint.value);
    if (!endpointInvalid.value) endpoint.value = settings.syncEndpoint;
}

// с секундами: в диалогах сравниваются две близкие метки, и без секунд они выглядели бы одинаково
const when = (ms: number): string => new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'medium' }).format(new Date(ms));

const canSync = computed(() => settings.syncEndpoint !== '' && !endpointInvalid.value && !cloud.busy.value);

const status = computed(() => {
    if (sync.syncedAt === 0) return t('sync.status.never');
    const base = t('sync.status.at', [when(sync.syncedAt)]);
    return sync.hasUnsynced ? `${base} ${t('sync.status.unsynced')}` : base;
});

function failureText(error: SyncFailure): string {
    return t(`sync.error.${error}`);
}

async function ask(title: string, message: string): Promise<boolean> {
    return await confirm(title).message(message).ok(t('sync.replace')).cancel(t('ui.confirm.no')).danger();
}

async function onUpload(): Promise<void> {
    applyEndpoint();
    if (endpointInvalid.value) return;

    const result = await cloud.upload({
        serverNewer: ({ serverExportedAt }) => ask(t('sync.confirm.serverNewer.title'), t('sync.confirm.serverNewer.message', [when(serverExportedAt)])),
    });

    if (result.status === 'ok') toast.success(t('sync.done.upload', [result.count]));
    else if (result.status === 'error') toast.error(failureText(result.error));
}

async function onDownload(): Promise<void> {
    applyEndpoint();
    if (endpointInvalid.value) return;

    const result = await cloud.download({
        localNewer: ({ changedAt, serverExportedAt }) => ask(t('sync.confirm.localNewer.title'), t('sync.confirm.localNewer.message', [when(changedAt), when(serverExportedAt)])),
    });

    if (result.status === 'ok') toast.success(t('sync.done.download', [result.count]));
    else if (result.status === 'empty') toast.warning(t('sync.empty'));
    else if (result.status === 'badData') toast.error(failureText('badResponse'));
    else if (result.status === 'error') toast.error(failureText(result.error));
}
</script>

<template>
    <div class="sync">
        <TaoFormField :error="endpointInvalid ? t('settings.sync.invalid') : ''">
            <TaoInput v-model="endpoint" class="webhook" autocomplete="off" :placeholder="t('settings.sync.placeholder')" :error="endpointInvalid" @blur="applyEndpoint" />
        </TaoFormField>
        <p class="hint">{{ t('sync.hint') }}</p>

        <div class="actions">
            <TaoButton size="small" variant="secondary" class="upload" :disabled="!canSync" :title="t('sync.upload.title')" @click="onUpload">
                <TaoIcon name="upload-cloud" /> {{ t('sync.upload.label') }}
            </TaoButton>
            <TaoButton size="small" variant="secondary" class="download" :disabled="!canSync" :title="t('sync.download.title')" @click="onDownload">
                <TaoIcon name="download" /> {{ t('sync.download.label') }}
            </TaoButton>
        </div>

        <p class="hint status">{{ status }}</p>
    </div>
</template>

<style scoped>
.sync {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-2, 8px);
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2, 8px);
}

.hint {
    margin: 0;
    font-size: var(--tao-font-size-sm);
    color: var(--tao-color-text-subtle);
}
</style>

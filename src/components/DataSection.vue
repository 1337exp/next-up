<script setup lang="ts">
import { confirm, TaoButton, TaoFileDrop, TaoIcon, toast } from '@1337exp/taoui';
import { MAX_IMPORT_BYTES, type ImportError } from '@/domain/transfer';
import { downloadTextFile, readFileText } from '@/lib/download';
import { useI18n } from '@/i18n';
import { useTasksStore } from '@/stores/tasks';

const { t } = useI18n();
const tasks = useTasksStore();

const MAX_MB = MAX_IMPORT_BYTES / 1024 / 1024;

function onExport(): void {
    const { name, text } = tasks.exportFile();
    downloadTextFile(name, text);
}

async function onRemoveAll(): Promise<void> {
    const ok = await confirm(t('tasks.notify.removeAll.title'))
        .message(t('tasks.notify.removeAll.message'))
        .ok(t('ui.confirm.yes'))
        .cancel(t('ui.confirm.no'))
        .danger();
    if (ok) tasks.removeAll();
}

function importErrorText(error: ImportError): string {
    return error === 'tooLarge' ? t('transfer.tooLarge', [MAX_MB]) : t(`transfer.${error}`);
}

async function onFiles(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_IMPORT_BYTES) {
        toast.error(importErrorText('tooLarge'));
        return;
    }

    let text: string;
    try {
        text = await readFileText(file);
    } catch {
        toast.error(t('transfer.readError'));
        return;
    }

    const result = tasks.importText(text);
    if (!result.ok) {
        toast.error(importErrorText(result.error));
        return;
    }

    const { added, updated, skipped, invalid, expired } = result.report;
    const lines = [t('transfer.done', [added, updated, skipped])];
    if (invalid > 0) lines.push(t('transfer.invalid', [invalid]));
    if (expired > 0) lines.push(t('transfer.expired', [expired]));

    if (added + updated > 0) toast.success(lines.join(' '));
    else toast.warning(lines.join(' '));
}
</script>

<template>
    <div class="data">
        <div class="actions">
            <TaoButton size="small" variant="secondary" class="export" @click="onExport"><TaoIcon name="download" /> {{ t('settings.export') }}</TaoButton>
            <TaoButton size="small" variant="danger" class="remove-all" @click="onRemoveAll"><TaoIcon name="trash-1" /> {{ t('settings.removeAll') }}</TaoButton>
        </div>

        <TaoFileDrop class="import" :model-value="[]" accept=".json,application/json,text/plain" :multiple="false" @files="onFiles">
            <strong>{{ t('settings.import') }}</strong>
            <span class="hint">{{ t('settings.data.dropHint') }}</span>
        </TaoFileDrop>
    </div>
</template>

<style scoped>
.data {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3, 12px);
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2, 8px);
}

.hint {
    display: block;
    margin-top: 4px;
    font-size: var(--tao-font-size-sm);
    color: var(--tao-color-text-subtle);
}
</style>

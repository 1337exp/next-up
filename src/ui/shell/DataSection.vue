<script setup lang="ts">
import { ref } from 'vue';
import { confirm, TaoButton, TaoFileDrop, toast } from '@1337exp/taoui';
import { downloadText, MAX_FILE_BYTES, readTextFile } from '@1337exp/taoux/file';
import { useNotesStore } from '@/app/notes';
import { TRASH_DAYS } from '@/core/constants';
import { exportFileName, type ImportResult } from '@/core/transfer';
import { repeatText, useI18n } from '@/i18n';

const { t } = useI18n();
const store = useNotesStore();

function exportJson(): void {
    downloadText(exportFileName(store.today, 'json'), store.exportJson());
}

function exportMarkdown(): void {
    downloadText(exportFileName(store.today, 'md'), store.exportMarkdown({ repeatLabel: repeatText }), 'text/markdown');
}

// --- импорт: файл любой известной версии, итог — одним уведомлением ---
const files = ref<File[]>([]);

function reportText(result: Extract<ImportResult, { ok: true }>): string {
    const { report } = result;
    const lines = [t('import.done', [report.added, report.updated, report.skipped])];
    if (report.upgraded) lines.push(report.fromVersion === 0 ? t('import.upgradedLegacy', [report.toVersion]) : t('import.upgraded', [report.fromVersion, report.toVersion]));
    if (report.invalid > 0) lines.push(t('import.invalid', [report.invalid]));
    if (report.expired > 0) lines.push(t('import.expired', [report.expired]));
    return lines.join(' ');
}

async function onFiles(): Promise<void> {
    const file = files.value[0];
    files.value = [];
    if (!file) return;

    const read = await readTextFile(file);
    if (!read.ok) {
        toast.danger(read.error === 'tooLarge' ? t('import.tooLarge', [MAX_FILE_BYTES / 1_000_000]) : t('import.unreadable'));
        return;
    }

    const result = store.importText(read.text);
    if (result.ok) toast().success().timeout(10_000).message(reportText(result));
    else toast.danger(result.error === 'newer' ? t('import.newer', [result.version ?? '?']) : t(`import.${result.error}`));
}

// --- удалить всё: единственный диалог в приложении, остальное отменяется ---
async function removeAll(): Promise<void> {
    const ok = await confirm(t('data.removeAll')).message(t('data.removeAllMessage', [TRASH_DAYS])).ok(t('ui.button.delete')).cancel(t('ui.button.cancel')).danger();
    if (!ok) return;
    store.removeAll();
    toast().info().timeout(8000).message(t('data.removeAllDone')).action(t('toast.undo'), () => void store.undo());
}
</script>

<template>
    <section class="data">
        <h3 class="tao-heading-6">{{ t('data.title') }}</h3>

        <div class="buttons">
            <TaoButton variant="secondary" icon="tao-arrow-down" @click="exportJson">{{ t('data.exportJson') }}</TaoButton>
            <TaoButton variant="secondary" icon="tao-arrow-down" @click="exportMarkdown">{{ t('data.exportMarkdown') }}</TaoButton>
        </div>

        <TaoFileDrop v-model="files" accept=".json,application/json" :list="false" @change="onFiles">{{ t('data.importHint') }}</TaoFileDrop>

        <TaoButton variant="ghost" tone="danger" icon="trash" class="remove-all" @click="removeAll">{{ t('data.removeAll') }}</TaoButton>
    </section>
</template>

<style scoped>
.data {
    display: flex;
    flex-direction: column;
    gap: var(--tao-space-3);
}

.data h3 {
    margin: 0;
}

.buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--tao-space-2);
}

.remove-all {
    align-self: flex-start;
}
</style>

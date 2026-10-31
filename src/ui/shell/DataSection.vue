<script setup lang="ts">
import { ref } from 'vue';
import { confirm, TaoButton, TaoFileDrop, TaoIcon, toast } from '@1337exp/taoui';
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
    <section class="nu-sec">
        <h3 class="nu-sec-title">{{ t('data.title') }}</h3>

        <div class="nu-card">
            <button type="button" class="nu-row action" @click="exportJson">
                <span>{{ t('data.exportJson') }}</span>
                <TaoIcon name="tao-arrow-down" />
            </button>
            <button type="button" class="nu-row action" @click="exportMarkdown">
                <span>{{ t('data.exportMarkdown') }}</span>
                <TaoIcon name="tao-arrow-down" />
            </button>
            <!-- принимаем любой файл: TaoFileDrop молча отбрасывает то, что не подошло под accept (старые файлы бывают .txt), а верность содержимого проверяет сам разбор -->
            <div class="nu-row drop">
                <TaoFileDrop v-model="files" :list="false" @change="onFiles">{{ t('data.importHint') }}</TaoFileDrop>
            </div>
        </div>

        <TaoButton variant="ghost" tone="danger" icon="tao-trash" class="remove-all" @click="removeAll">{{ t('data.removeAll') }}</TaoButton>
    </section>
</template>

<style scoped>
.action {
    width: 100%;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;
}

.action:hover {
    background: var(--tao-color-surface-hover);
}

.action:focus-visible {
    outline: 2px solid var(--tao-color-accent);
    outline-offset: -2px;
}

.drop {
    display: block;
}

.remove-all {
    align-self: flex-start;
}
</style>

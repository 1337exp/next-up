import { ref } from 'vue';
import { getSyncAdapter } from '@/sync';
import type { ImportReport, SyncAdapter, SyncFailure } from '@/sync/types';
import { useSettingsStore } from '@/stores/settings';
import { useSyncStore } from '@/stores/sync';
import { useTasksStore } from '@/stores/tasks';

export type DownloadOutcome =
    | { status: 'ok'; count: number; report: ImportReport }
    | { status: 'empty' } // на сервере пока ничего нет
    | { status: 'cancelled' }
    | { status: 'noEndpoint' }
    | { status: 'badData' }
    | { status: 'error'; error: SyncFailure };

export type UploadOutcome = { status: 'ok'; count: number } | { status: 'cancelled' } | { status: 'noEndpoint' } | { status: 'error'; error: SyncFailure };

/** Спрашивает пользователя; интерфейс подставляет свой диалог, а здесь он не нужен. */
export interface SyncConfirms {
    /** Скачивание: на устройстве изменения новее, чем снимок на сервере. */
    localNewer(info: { changedAt: number; serverExportedAt: number }): Promise<boolean>;
    /** Загрузка: на сервере данные новее, чем наша последняя синхронизация. */
    serverNewer(info: { serverExportedAt: number }): Promise<boolean>;
}

/**
 * «Загрузить» (на сервер) и «Скачать» (с сервера): грубая схема целиком, по меткам времени `exportedAt`.
 * Данные заменяются полностью, поэтому перед возможной потерей изменений спрашиваем (`confirms`).
 * Схему по отдельным записям (слияние и надгробия) можно сделать позже, формат снимка для этого уже подходит.
 */
export function useCloudSync(makeAdapter: (endpoint: string) => SyncAdapter | null = (endpoint) => getSyncAdapter({ sync: { endpoint } })) {
    const settings = useSettingsStore();
    const tasks = useTasksStore();
    const sync = useSyncStore();
    const busy = ref(false);

    function adapter(): SyncAdapter | null {
        return settings.syncEndpoint === '' ? null : makeAdapter(settings.syncEndpoint);
    }

    async function download(confirms: Pick<SyncConfirms, 'localNewer'>): Promise<DownloadOutcome> {
        const remote = adapter();
        if (!remote) return { status: 'noEndpoint' };
        if (busy.value) return { status: 'cancelled' };

        busy.value = true;
        try {
            const pulled = await remote.pull();
            if (!pulled.ok) return { status: 'error', error: pulled.error };
            const snapshot = pulled.snapshot;
            if (!snapshot) return { status: 'empty' };

            // на устройстве есть правки позже, чем сохранённый на сервере снимок: скачивание их затрёт
            if (sync.changedAt > snapshot.exportedAt && !(await confirms.localNewer({ changedAt: sync.changedAt, serverExportedAt: snapshot.exportedAt }))) {
                return { status: 'cancelled' };
            }

            const report = tasks.importSnapshot(snapshot, 'replace');
            if (!report) return { status: 'badData' };

            sync.markDownloaded(snapshot.exportedAt);
            return { status: 'ok', count: tasks.tasks.length, report };
        } finally {
            busy.value = false;
        }
    }

    async function upload(confirms: Pick<SyncConfirms, 'serverNewer'>): Promise<UploadOutcome> {
        const remote = adapter();
        if (!remote) return { status: 'noEndpoint' };
        if (busy.value) return { status: 'cancelled' };

        busy.value = true;
        try {
            const snapshot = tasks.exportSnapshot();
            let result = await remote.push(snapshot, { syncedAt: sync.syncedAt });

            // сервер сохранил снимок позже нашей последней синхронизации: другое устройство успело загрузить своё
            if (!result.ok && result.error === 'conflict') {
                if (!(await confirms.serverNewer({ serverExportedAt: result.serverExportedAt }))) return { status: 'cancelled' };
                result = await remote.push(snapshot, { syncedAt: sync.syncedAt, force: true });
            }

            if (!result.ok) return { status: 'error', error: result.error === 'conflict' ? 'server' : result.error };

            sync.markUploaded(snapshot.exportedAt);
            return { status: 'ok', count: snapshot.tasks.length };
        } finally {
            busy.value = false;
        }
    }

    return { busy, download, upload };
}

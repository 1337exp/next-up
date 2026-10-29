import { computed, onScopeDispose, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { createSavedStorage } from '@1337exp/taoux/storage';
import { runSync, type SyncFailure, type SyncResult } from '@/core/sync';
import { useNotesStore } from '@/app/notes';
import { useSettingsStore } from '@/app/settings';
import { createHttpProvider, normalizeEndpoint } from '@/app/syncHttp';

/** `off` — выключено или адрес не годится; `offline` — нет сети, попытка будет, когда она появится. */
export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error';

/** Пауза после правки, прежде чем отправлять: пока пользователь печатает, сервер не дёргаем. */
export const DEBOUNCE_MS = 3000;
/** Возврат на вкладку не чаще, чем раз в столько мс запускает синхронизацию. */
export const FOCUS_GAP_MS = 15_000;

const parseTime = (text: string | null): number | null => {
    const value = text === null ? NaN : Number(text);
    return Number.isFinite(value) && value > 0 ? value : null;
};

export const useSyncStore = defineStore('sync', () => {
    const { settings } = useSettingsStore();
    const notes = useNotesStore();
    const storage = createSavedStorage('nextup.sync');

    const endpoint = computed(() => normalizeEndpoint(settings.sync.url));
    const enabled = computed(() => settings.sync.enabled && endpoint.value !== null);
    const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine);
    const running = ref(false);
    const failure = ref<SyncFailure | null>(null);
    const lastSyncedAt = ref<number | null>(parseTime(storage.read()));

    const status = computed<SyncStatus>(() => {
        if (!enabled.value) return 'off';
        if (running.value) return 'syncing';
        if (!online.value) return 'offline';
        return failure.value ? 'error' : 'idle';
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    let lastAttempt = 0;

    function schedule(): void {
        clearTimeout(timer);
        timer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
    }

    /** Один сеанс. `null` — не запускался (выключено, нет сети, уже идёт: тогда запомнит и повторит). */
    async function syncNow(): Promise<SyncResult | null> {
        if (!enabled.value || !online.value) return null;
        if (running.value) {
            pending = true;
            return null;
        }

        running.value = true;
        lastAttempt = Date.now();
        try {
            const provider = createHttpProvider({ url: endpoint.value!, authorization: settings.sync.authorization });
            const result = await runSync(provider, { getNotes: () => notes.notes, setNotes: notes.applyRemote, now: Date.now });
            if (result.ok) {
                failure.value = null;
                lastSyncedAt.value = Date.now();
                storage.write(String(lastSyncedAt.value));
            } else {
                failure.value = result.error;
            }
            return result;
        } finally {
            running.value = false;
            // правка пришла во время сеанса: отправим её отдельным сеансом, а не потеряем
            if (pending) {
                pending = false;
                schedule();
            }
        }
    }

    // правка пользователя → через паузу отправляем
    watch(
        () => notes.revision,
        () => {
            if (enabled.value) schedule();
        },
    );

    // включили или поменяли адрес / ключ: сразу пробуем, ошибка прежней настройки не относится к новой
    watch(
        () => [enabled.value, endpoint.value, settings.sync.authorization],
        () => {
            failure.value = null;
            if (enabled.value) void syncNow();
        },
    );

    function onVisible(): void {
        if (document.visibilityState === 'visible' && enabled.value && Date.now() - lastAttempt > FOCUS_GAP_MS) void syncNow();
    }
    const onOnline = (): void => {
        online.value = true;
        void syncNow();
    };
    const onOffline = (): void => void (online.value = false);

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    onScopeDispose(() => {
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisible);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
    });

    // при старте: забрать то, что изменилось на других устройствах
    if (enabled.value) queueMicrotask(() => void syncNow());

    return { status, failure, lastSyncedAt, endpoint, syncNow };
});

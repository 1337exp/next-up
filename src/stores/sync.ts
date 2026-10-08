import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { createBrowserJsonStorage, KEYS } from '@/storage/local';

/**
 * Две метки времени (мс) для грубой синхронизации «целиком»:
 * - `changedAt`: последнее изменение данных на этом устройстве (правка пользователя, импорт файла);
 *   автоматические пересчёты (смена дня, повторы) его не трогают, иначе оно «обновлялось» бы само каждый день.
 * - `syncedAt`: `exportedAt` снимка, с которым устройство в последний раз обменялось с сервером.
 * Данные на устройстве «новее сервера», если `changedAt` позже, чем `exportedAt` снимка на сервере.
 */
interface SyncState {
    changedAt: number;
    syncedAt: number;
}

const time = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

export function parseSyncState(raw: unknown): SyncState {
    const record = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    return { changedAt: time(record.changedAt), syncedAt: time(record.syncedAt) };
}

export const useSyncStore = defineStore('sync', () => {
    const storage = createBrowserJsonStorage();
    const state = ref<SyncState>(parseSyncState(storage.read(KEYS.syncState)));

    const changedAt = computed(() => state.value.changedAt);
    const syncedAt = computed(() => state.value.syncedAt);
    /** С последней синхронизации данные на устройстве менялись. */
    const hasUnsynced = computed(() => state.value.changedAt > state.value.syncedAt);

    function save(): void {
        storage.write(KEYS.syncState, state.value);
    }

    /** Данные изменены на этом устройстве. */
    function markLocalChange(now: number): void {
        state.value.changedAt = now;
        save();
    }

    /** Снимок отдан на сервер: сервер теперь содержит то, что у нас. */
    function markUploaded(exportedAt: number): void {
        state.value.syncedAt = exportedAt;
        save();
    }

    /** Снимок скачан и заменил данные: у нас ровно то, что на сервере, поэтому «несинхронизированного» нет. */
    function markDownloaded(exportedAt: number): void {
        state.value.syncedAt = exportedAt;
        state.value.changedAt = exportedAt;
        save();
    }

    return { changedAt, syncedAt, hasUnsynced, markLocalChange, markUploaded, markDownloaded };
});

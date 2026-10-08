import type { ImportReport, MergeStrategy } from '@/domain/snapshot';
import type { Snapshot } from '@/domain/types';

/**
 * Точка расширения для синхронизации с внешними источниками.
 * Обмен идёт тем же форматом `Snapshot`, что и файл экспорта: «выход» — `push`, «вход» — `pull`.
 */
export interface SyncAdapter {
    /** Вход: получить внешнее состояние. */
    pull(): Promise<Snapshot>;
    /** Выход: отдать текущее состояние. */
    push(snapshot: Snapshot): Promise<void>;
}

export type { ImportReport, MergeStrategy };

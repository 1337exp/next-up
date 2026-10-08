import type { ImportReport, MergeStrategy } from '@/domain/snapshot';
import type { Snapshot } from '@/domain/types';

/**
 * Причины, по которым обмен с сервером не удался. Подробности (текст ответа) наружу не отдаём:
 * адрес содержит токен, а ответ может быть чем угодно.
 */
export type SyncFailure = 'network' | 'timeout' | 'unauthorized' | 'server' | 'badResponse' | 'tooLarge';

/** `snapshot: null` — на сервере пока ничего нет (404). */
export type PullResult = { ok: true; snapshot: Snapshot | null } | { ok: false; error: SyncFailure };

/** `conflict` — на сервере данные новее, чем те, с которыми клиент синхронизировался в последний раз. */
export type PushResult = { ok: true } | { ok: false; error: 'conflict'; serverExportedAt: number } | { ok: false; error: SyncFailure };

export interface PushOptions {
    /** `exportedAt` последней синхронизации (`0` — ещё не синхронизировались): сервер сверяет с ним свою версию. */
    syncedAt: number;
    /** Записать, даже если на сервере данные новее (пользователь подтвердил). */
    force?: boolean;
}

/**
 * Обмен с внешним хранилищем целым снимком `Snapshot` (тем же, что файл экспорта).
 * Грубая схема «заменить целиком»: учёт по отдельным записям (см. docs/PLAN.md §10) может прийти позже.
 */
export interface SyncAdapter {
    /** Вход: получить снимок с сервера. */
    pull(): Promise<PullResult>;
    /** Выход: отдать текущий снимок. */
    push(snapshot: Snapshot, options: PushOptions): Promise<PushResult>;
}

export type { ImportReport, MergeStrategy };

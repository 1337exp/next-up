import { exportSnapshot, upgrade } from './codec';
import { mergeNotes, type MergeReport } from './merge';
import type { Note } from './model';

/**
 * Синхронизация документа целиком: `GET` отдаёт снимок и ETag, `PUT` с `If-Match` принимает его, а при `412` клиент
 * забирает свежее, сливает по записям и повторяет. Диалогов «заменить?» нет: слияние по `updatedAt` с надгробиями
 * (core/merge.ts) разбирает конфликты само. Транспорт (HTTP, WebDAV…) — `SyncProvider`.
 */

/** `conflict` — условие записи не выполнено (кто-то записал раньше); `newer` — на сервере данные более новой версии. */
export type SyncFailure = 'network' | 'timeout' | 'unauthorized' | 'server' | 'badResponse' | 'tooLarge' | 'newer' | 'conflict';

/** `body: null` — на сервере пока ничего нет. `etag: null` — сервер не сообщил метку (запись будет безусловной). */
export type PullResult = { ok: true; body: string | null; etag: string | null } | { ok: false; error: SyncFailure };
export type PushResult = { ok: true } | { ok: false; error: SyncFailure };

export interface PushCondition {
    /** ETag, который мы видели при чтении. */
    etag: string | null;
    /** Документ на сервере уже есть (иначе пишем с `If-None-Match: *`). */
    exists: boolean;
}

export interface SyncProvider {
    pull(): Promise<PullResult>;
    push(text: string, condition: PushCondition): Promise<PushResult>;
}

/** Что движку нужно от приложения: список заметок и место, куда положить результат слияния. */
export interface SyncHost {
    getNotes(): Note[];
    /** Принять слияние (приложение пересчитает повторы и сохранит; это не правка пользователя, отмены нет). */
    setNotes(notes: Note[]): void;
    now(): number;
}

export interface SyncReport {
    /** Что пришло с сервера. */
    pulled: MergeReport;
    /** Мы отправили свои изменения. */
    pushed: boolean;
    /** Сколько кругов «забрать → слить → отправить» понадобилось. */
    rounds: number;
}

export type SyncResult = { ok: true; report: SyncReport } | { ok: false; error: SyncFailure };

export const MAX_ROUNDS = 3;

/** Есть ли у нас то, чего нет на сервере в таком же виде. */
function needsPush(local: readonly Note[], remote: readonly Note[], remoteExists: boolean): boolean {
    if (!remoteExists) return local.length > 0;
    const remoteById = new Map(remote.map((n) => [n.id, n]));
    return local.some((n) => {
        const r = remoteById.get(n.id);
        return !r || r.updatedAt !== n.updatedAt || r.deletedAt !== n.deletedAt;
    });
}

/**
 * Один сеанс: забрать, слить, при необходимости отправить; при конфликте (`412`) повторить до `MAX_ROUNDS` раз.
 * Ошибки возвращаются, а не бросаются.
 */
export async function runSync(provider: SyncProvider, host: SyncHost): Promise<SyncResult> {
    const pulled: MergeReport = { added: 0, updated: 0, skipped: 0 };

    for (let round = 1; round <= MAX_ROUNDS; round++) {
        const pull = await provider.pull();
        if (!pull.ok) return pull;

        let remote: Note[] = [];
        if (pull.body !== null) {
            let raw: unknown;
            try {
                raw = JSON.parse(pull.body);
            } catch {
                return { ok: false, error: 'badResponse' };
            }
            const upgraded = upgrade(raw);
            if (!upgraded.ok) return { ok: false, error: upgraded.error === 'newer' ? 'newer' : 'badResponse' };
            remote = upgraded.snapshot.notes;
        }

        const { notes, report } = mergeNotes(host.getNotes(), remote);
        pulled.added += report.added;
        pulled.updated += report.updated;
        pulled.skipped += report.skipped;
        if (report.added + report.updated > 0) host.setNotes(notes);

        // после setNotes список мог пересчитаться (повторы, чистка): отправляем то, что стало
        const local = host.getNotes();
        if (!needsPush(local, remote, pull.body !== null)) return { ok: true, report: { pulled, pushed: false, rounds: round } };

        const text = JSON.stringify(exportSnapshot(local, host.now()));
        const push = await provider.push(text, { etag: pull.etag, exists: pull.body !== null });
        if (push.ok) return { ok: true, report: { pulled, pushed: true, rounds: round } };
        if (push.error !== 'conflict') return push;
        // кто-то записал между нашим чтением и записью: забираем его версию и сливаем ещё раз
    }

    return { ok: false, error: 'conflict' };
}

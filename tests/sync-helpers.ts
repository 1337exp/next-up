import { exportSnapshot } from '@/core/codec';
import { normalize } from '@/core/lifecycle';
import type { Note } from '@/core/model';
import type { PullResult, PushCondition, PushResult, SyncHost, SyncProvider } from '@/core/sync';

export const TODAY = '2026-10-10';

/** «Устройство»: список заметок и то, как движок его читает и меняет (как стор: после слияния пересчёт повторов). */
export function device(initial: Note[] = [], now = 1000): SyncHost & { notes: Note[]; clock: number } {
    const host = {
        notes: initial,
        clock: now,
        getNotes: () => host.notes,
        setNotes: (notes: Note[]) => void (host.notes = normalize(notes, TODAY, host.clock)),
        now: () => host.clock,
    };
    return host;
}

/** Сервер в памяти с настоящей семантикой условий: `If-Match` по ETag, `If-None-Match: *`. */
export class FakeServer implements SyncProvider {
    body: string | null = null;
    version = 0;
    calls = { pull: 0, push: 0 };
    /** Один раз перед записью: «кто-то записал раньше нас». */
    beforePush: (() => void) | null = null;

    etag = (): string | null => (this.body === null ? null : `"v${this.version}"`);

    store(notes: readonly Note[], now = 1): void {
        this.body = JSON.stringify(exportSnapshot(notes, now));
        this.version++;
    }

    async pull(): Promise<PullResult> {
        this.calls.pull++;
        return { ok: true, body: this.body, etag: this.etag() };
    }

    async push(text: string, condition: PushCondition): Promise<PushResult> {
        this.calls.push++;
        const hook = this.beforePush;
        this.beforePush = null;
        hook?.();
        if (condition.etag && condition.etag !== this.etag()) return { ok: false, error: 'conflict' };
        if (!condition.etag && !condition.exists && this.body !== null) return { ok: false, error: 'conflict' };
        this.body = text;
        this.version++;
        return { ok: true };
    }
}

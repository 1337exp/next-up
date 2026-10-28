import { SNAPSHOT_APP, SNAPSHOT_VERSION, type Note, type Snapshot } from '../model';
import { legacyToV1 } from './migrations/legacy';
import { isRecord, type Step } from './migrations/types';
import { v1ToV2 } from './migrations/v1';
import { parseNote } from './parse';

export { parseNote } from './parse';

/**
 * Единый вход для любых данных: файл, хранилище, сервер. `определить версию → поднять до текущей → проверить записи`.
 * Версия 0 — массив из самого первого приложения, 1 — прежний Next Up. Новая схема = новый файл в `migrations/`,
 * запись в `STEPS` и замороженный файл в `tests/fixtures/`.
 */
const STEPS: Record<number, Step> = { 0: legacyToV1, 1: v1ToV2 };

export interface UpgradeReport {
    fromVersion: number;
    toVersion: number;
    /** Данные были старой версии и подняты до текущей. */
    upgraded: boolean;
    /** Сколько записей отброшено как непригодные. */
    invalid: number;
}

export type UpgradeResult =
    | { ok: true; snapshot: Snapshot; report: UpgradeReport }
    /** `unknown` — не наш формат; `newer` — создан более новой версией приложения. */
    | { ok: false; error: 'unknown' | 'newer'; version?: number };

export function detectVersion(raw: unknown): number | null {
    if (Array.isArray(raw)) return 0;
    if (!isRecord(raw)) return null;
    if (raw.app === SNAPSHOT_APP && Number.isInteger(raw.version)) return raw.version as number;
    if (raw.format === SNAPSHOT_APP && Number.isInteger(raw.schemaVersion)) return raw.schemaVersion as number;
    return null;
}

export function upgrade(raw: unknown): UpgradeResult {
    const fromVersion = detectVersion(raw);
    if (fromVersion === null || fromVersion < 0) return { ok: false, error: 'unknown' };
    if (fromVersion > SNAPSHOT_VERSION) return { ok: false, error: 'newer', version: fromVersion };

    let doc = raw;
    let invalid = 0;
    for (let version = fromVersion; version < SNAPSHOT_VERSION; version++) {
        const result = STEPS[version]!(doc);
        doc = result.doc;
        invalid += result.invalid;
    }

    const source = isRecord(doc) && Array.isArray(doc.notes) ? doc.notes : null;
    if (!source) return { ok: false, error: 'unknown' };

    const notes: Note[] = [];
    for (const record of source) {
        const note = parseNote(record);
        if (note) notes.push(note);
        else invalid++;
    }

    const exportedAt = isRecord(doc) && typeof doc.exportedAt === 'number' && Number.isFinite(doc.exportedAt) ? doc.exportedAt : 0;
    return {
        ok: true,
        snapshot: { app: SNAPSHOT_APP, version: SNAPSHOT_VERSION, exportedAt, notes },
        report: { fromVersion, toVersion: SNAPSHOT_VERSION, upgraded: fromVersion < SNAPSHOT_VERSION, invalid },
    };
}

export function exportSnapshot(notes: readonly Note[], now: number): Snapshot {
    return { app: SNAPSHOT_APP, version: SNAPSHOT_VERSION, exportedAt: now, notes: notes.map((n) => ({ ...n, items: n.items.map((i) => ({ ...i })) })) };
}

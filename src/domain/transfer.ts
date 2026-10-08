import { RETENTION_DAYS } from './constants';
import { addDays, type IsoDate } from './date';
import { exportSnapshot, mergeTasks, parseImport, type ImportReport, type MergeStrategy, type ParsedImport } from './snapshot';
import type { Task } from './types';

/** localStorage вмещает около 5 МБ: файл больше этого всё равно не поместился бы. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ImportError = 'tooLarge' | 'notJson' | 'unknownFormat';

export type ImportResult = { ok: true; tasks: Task[]; report: ImportReport } | { ok: false; error: ImportError };

/** Имя файла экспорта: `nextup-2026-10-07.json`. */
export function exportFileName(today: IsoDate): string {
    return `nextup-${today}.json`;
}

export function serializeExport(tasks: readonly Task[], now: number): string {
    return JSON.stringify(exportSnapshot(tasks, now), null, 2);
}

/**
 * Слить уже разобранные данные с текущим списком. Записи старше RETENTION_DAYS отбрасываются до слияния:
 * иначе отчёт обещал бы «добавлено N», а чистка тут же их удалила бы.
 */
export function mergeIncoming(current: readonly Task[], parsed: ParsedImport, today: IsoDate, strategy: MergeStrategy = 'merge-by-updated-at'): { tasks: Task[]; report: ImportReport } {
    const horizon = addDays(today, -RETENTION_DAYS);
    const fresh = parsed.tasks.filter((task) => task.date >= horizon);

    const { tasks, report } = mergeTasks(current, fresh, strategy, parsed.invalid);
    return { tasks, report: { ...report, expired: parsed.tasks.length - fresh.length } };
}

/** Содержимое файла → слитый список и отчёт. Понимает файл этого приложения и экспорт старой версии. */
export function importFromText(text: string, current: readonly Task[], today: IsoDate): ImportResult {
    if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'tooLarge' };

    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'notJson' };
    }

    const parsed = parseImport(raw);
    if (!parsed) return { ok: false, error: 'unknownFormat' };

    return { ok: true, ...mergeIncoming(current, parsed, today) };
}

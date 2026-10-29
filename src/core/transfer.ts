import { upgrade, type UpgradeReport } from './codec';
import { RETENTION_DAYS } from './constants';
import { addDays, formatUserDate, type IsoDate } from './date';
import { mergeNotes, type MergeReport } from './merge';
import type { Note, Repeat } from './model';

export interface ImportReport extends UpgradeReport, MergeReport {
    /** Срок старше RETENTION_DAYS: чистка всё равно удалила бы такие заметки, поэтому они не импортируются. */
    expired: number;
}

export type ImportResult =
    | { ok: true; notes: Note[]; report: ImportReport }
    /** `notJson` — не JSON; `unknown` — не наш формат; `newer` — создан более новой версией приложения. */
    | { ok: false; error: 'notJson' | 'unknown' | 'newer'; version?: number };

/**
 * Импорт из текста файла: любая версия формата (см. codec) → слияние с текущим списком по id.
 * При ошибке список не меняется. Файл старой версии поднимается до текущей, а отчёт говорит, что это произошло.
 */
export function importNotes(text: string, current: readonly Note[], today: IsoDate, now: number): ImportResult {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return { ok: false, error: 'notJson' };
    }

    const upgraded = upgrade(raw);
    if (!upgraded.ok) return upgraded.error === 'newer' ? { ok: false, error: 'newer', version: upgraded.version } : { ok: false, error: 'unknown' };

    const horizon = addDays(today, -RETENTION_DAYS);
    const kept = upgraded.snapshot.notes.filter((note) => note.deletedAt !== null || note.due >= horizon);
    const expired = upgraded.snapshot.notes.length - kept.length;

    // Файл — это явное желание пользователя вернуть заметки: живая запись из него побеждает локальное удаление.
    // Обычное слияние оставило бы удалённое удалённым (удаление новее), а при синхронизации так и надо.
    // Свежий updatedAt нужен, чтобы возвращение дошло и до других устройств.
    const deleted = new Map(current.filter((note) => note.deletedAt !== null).map((note) => [note.id, note]));
    const incoming = kept.map((note) => {
        const tombstone = deleted.get(note.id);
        // строго новее удаления, даже если часы устройств расходятся
        return note.deletedAt === null && tombstone ? { ...note, updatedAt: Math.max(now, tombstone.updatedAt + 1) } : note;
    });

    const { notes, report } = mergeNotes(current, incoming);
    return { ok: true, notes, report: { ...upgraded.report, ...report, expired } };
}

export function exportFileName(today: IsoDate, extension: 'json' | 'md' = 'json'): string {
    return `nextup-${today}.${extension}`;
}

export interface MarkdownOptions {
    /** Подпись правила повтора на языке пользователя; без неё повтор не выводится. */
    repeatLabel?: (repeat: Repeat) => string;
}

/** Читаемый дамп для людей и других программ: по заметке на раздел, пункты в стандартном виде `- [x]`. Живые заметки по сроку. */
export function toMarkdown(notes: readonly Note[], { repeatLabel }: MarkdownOptions = {}): string {
    const live = notes.filter((n) => n.deletedAt === null).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));

    const blocks = live.map((note) => {
        const parts = [`## ${formatUserDate(note.due)}`];
        if (note.body) parts.push(note.body);
        if (note.items.length) parts.push(note.items.map((item) => `- [${item.doneAt === null ? ' ' : 'x'}] ${item.text}`).join('\n'));
        if (note.repeat && repeatLabel) parts.push(`*${repeatLabel(note.repeat)}*`);
        return parts.join('\n\n');
    });

    return `# Next Up\n\n${blocks.join('\n\n---\n\n')}\n`;
}

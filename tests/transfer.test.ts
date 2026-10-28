import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotesStore } from '@/app/notes';
import { exportSnapshot } from '@/core/codec';
import { addDays, todayIso } from '@/core/date';
import { isPurged, trashed } from '@/core/lifecycle';
import { purgeNote, removeNote } from '@/core/notes';
import { exportFileName, importNotes, toMarkdown } from '@/core/transfer';
import legacy from './fixtures/legacy.json';
import v1 from './fixtures/v1.json';
import { item, note } from './helpers';

const TODAY = '2026-10-10';
const NOW = Date.UTC(2026, 9, 10);

describe('импорт', () => {
    it('файл версии 1: поднимается до текущей, отчёт это сообщает', () => {
        const result = importNotes(JSON.stringify(v1), [], TODAY, NOW);
        if (!result.ok) throw new Error(result.error);
        expect(result.report).toMatchObject({ fromVersion: 1, toVersion: 2, upgraded: true, invalid: 1, added: 3, updated: 0, skipped: 0 });
    });

    it('файл из первого приложения', () => {
        const result = importNotes(JSON.stringify(legacy), [], TODAY, NOW);
        if (!result.ok) throw new Error(result.error);
        expect(result.report).toMatchObject({ fromVersion: 0, upgraded: true, invalid: 2 });
        expect(result.notes.map((n) => n.body)).toContain('Позвонить в банк #работа');
    });

    it('повторный импорт того же файла ничего не дублирует', () => {
        const first = importNotes(JSON.stringify(v1), [], TODAY, NOW);
        if (!first.ok) throw new Error();
        const second = importNotes(JSON.stringify(v1), first.notes, TODAY, NOW);
        if (!second.ok) throw new Error();
        expect(second.notes).toHaveLength(first.notes.length);
        expect(second.report).toMatchObject({ added: 0, updated: 0, skipped: 3 });
    });

    it('записи, уже лежащие в приложении, сильнее импортированных из старых версий (updatedAt 0)', () => {
        const mine = note({ id: 'a1', due: TODAY, body: 'моя версия', updatedAt: 5 });
        const result = importNotes(JSON.stringify(legacy), [mine], TODAY, NOW);
        if (!result.ok) throw new Error();
        expect(result.notes.find((n) => n.id === 'a1')!.body).toBe('моя версия');
    });

    it('слишком старые заметки не импортируются и считаются отдельно', () => {
        const file = JSON.stringify(exportSnapshot([note({ id: 'old', due: '2020-01-01' }), note({ id: 'new', due: TODAY })], 1));
        const result = importNotes(file, [], TODAY, NOW);
        if (!result.ok) throw new Error();
        expect(result.notes.map((n) => n.id)).toEqual(['new']);
        expect(result.report.expired).toBe(1);
    });

    it('ошибки не меняют список: не JSON, чужой формат, версия новее', () => {
        expect(importNotes('{не json', [], TODAY, NOW)).toEqual({ ok: false, error: 'notJson' });
        expect(importNotes('{"hello":1}', [], TODAY, NOW)).toEqual({ ok: false, error: 'unknown' });
        expect(importNotes('{"app":"nextup","version":99,"notes":[]}', [], TODAY, NOW)).toEqual({ ok: false, error: 'newer', version: 99 });
    });

    it('файл возвращает заметки, удалённые после его создания, и это дойдёт до других устройств', () => {
        const mine = note({ id: 'a', due: TODAY, body: 'из файла', updatedAt: 5 });
        const file = JSON.stringify(exportSnapshot([mine], 5));
        const deleted = removeNote(mine, 100);

        const result = importNotes(file, [deleted], TODAY, 200);
        if (!result.ok) throw new Error();
        expect(result.notes[0]).toMatchObject({ deletedAt: null, body: 'из файла', updatedAt: 200 });
        expect(result.report.updated).toBe(1);
    });

    it('круг: экспорт → импорт в пустой список даёт те же заметки', () => {
        const notes = [note({ id: 'a', due: TODAY, items: [item('i', 'x', 7)], updatedAt: 3 })];
        const result = importNotes(JSON.stringify(exportSnapshot(notes, 1)), [], TODAY, NOW);
        if (!result.ok) throw new Error();
        expect(result.notes).toEqual(notes);
        expect(result.report.upgraded).toBe(false);
    });
});

describe('экспорт', () => {
    it('имя файла', () => {
        expect(exportFileName(TODAY)).toBe('nextup-2026-10-10.json');
        expect(exportFileName(TODAY, 'md')).toBe('nextup-2026-10-10.md');
    });

    it('Markdown: по сроку, пункты в стандартном виде, удалённые не попадают', () => {
        const md = toMarkdown(
            [
                note({ id: 'b', due: '2026-10-12', body: 'позже' }),
                note({ id: 'a', due: '2026-10-11', body: 'раньше', items: [item('1', 'сделано', 5), item('2', 'нет')], repeat: { series: 's', anchor: '2026-10-11', every: 1, unit: 'week' } }),
                removeNote(note({ id: 'x', due: '2026-10-10', body: 'удалена' }), 1),
            ],
            { repeatLabel: () => 'Каждую неделю' },
        );
        expect(md).toBe('# Next Up\n\n## 11.10.2026\n\nраньше\n\n- [x] сделано\n- [ ] нет\n\n*Каждую неделю*\n\n---\n\n## 12.10.2026\n\nпозже\n');
        expect(md).not.toContain('удалена');
    });
});

describe('корзина', () => {
    it('навсегда удалённая пропадает из корзины, но остаётся надгробием', () => {
        const gone = purgeNote(removeNote(note({ id: 'a', due: TODAY }), NOW), NOW);
        expect(isPurged(gone, NOW)).toBe(true);
        expect(gone.deletedAt).not.toBeNull();
        expect(trashed([gone], NOW)).toEqual([]);
        expect(gone.updatedAt).toBe(NOW); // побеждает при слиянии
    });
});

describe('стор: корзина, «удалить всё», импорт', () => {
    const today = todayIso();
    const input = (body: string) => ({ due: addDays(today, 2), body, items: [], repeat: null });

    beforeEach(() => {
        vi.useFakeTimers();
        localStorage.clear();
        setActivePinia(createPinia());
    });
    afterEach(() => vi.useRealTimers());

    it('удалить → корзина → восстановить / удалить навсегда', () => {
        const store = useNotesStore();
        store.add(input('a'));
        store.add(input('b'));
        const a = store.active.find((n) => n.body === 'a');
        const b = store.active.find((n) => n.body === 'b');

        store.remove(a!.id);
        store.remove(b!.id);
        expect(store.active).toHaveLength(0);
        expect(store.trash).toHaveLength(2);

        store.restore(a!.id);
        expect(store.active.map((n) => n.body)).toEqual(['a']);
        store.purge(b!.id);
        expect(store.trash).toHaveLength(0);
        expect(store.notes.find((n) => n.id === b!.id)).toBeTruthy(); // надгробие осталось
    });

    it('«удалить всё» кладёт в корзину и отменяется одним шагом', () => {
        const store = useNotesStore();
        store.add(input('a'));
        store.add(input('b'));
        vi.advanceTimersByTime(5000);

        store.removeAll();
        expect(store.active).toHaveLength(0);
        expect(store.trash).toHaveLength(2);
        store.undo();
        expect(store.active).toHaveLength(2);
    });

    it('«очистить корзину»', () => {
        const store = useNotesStore();
        store.add(input('a'));
        store.remove(store.active[0]!.id);
        store.emptyTrash();
        expect(store.trash).toHaveLength(0);
    });

    it('импорт: меняет список, один шаг отмены; при ошибке список не меняется', () => {
        const store = useNotesStore();
        store.add(input('своя'));
        vi.advanceTimersByTime(5000);

        expect(store.importText('мусор').ok).toBe(false);
        expect(store.notes).toHaveLength(1);

        const file = JSON.stringify(exportSnapshot([note({ id: 'in1', due: addDays(today, 3) }), note({ id: 'in2', due: addDays(today, 4) })], 1));
        expect(store.importText(file).ok).toBe(true);
        expect(store.active).toHaveLength(3);
        store.undo();
        expect(store.active).toHaveLength(1);
    });

    it('экспорт из стора читается обратно', () => {
        const store = useNotesStore();
        store.add(input('экспортируем'));
        const text = store.exportJson();
        store.removeAll();
        expect(store.importText(text).ok).toBe(true);
        expect(store.active.map((n) => n.body)).toEqual(['экспортируем']);
    });
});

import { describe, expect, it } from 'vitest';
import { detectVersion, upgrade } from '@/core/codec';
import { normalize } from '@/core/lifecycle';
import { SNAPSHOT_VERSION } from '@/core/model';
import legacy from './fixtures/legacy.json';
import v1 from './fixtures/v1.json';

function ok(raw: unknown) {
    const result = upgrade(raw);
    if (!result.ok) throw new Error(`upgrade failed: ${result.error}`);
    return result;
}

describe('версии', () => {
    it('определяет версию', () => {
        expect(detectVersion(legacy)).toBe(0);
        expect(detectVersion(v1)).toBe(1);
        expect(detectVersion({ app: 'nextup', version: 2, notes: [] })).toBe(2);
        expect(detectVersion({ hello: 1 })).toBeNull();
        expect(detectVersion('x')).toBeNull();
    });

    it('файл более новой версии отклоняется', () => {
        expect(upgrade({ app: 'nextup', version: SNAPSHOT_VERSION + 1, notes: [] })).toEqual({ ok: false, error: 'newer', version: SNAPSHOT_VERSION + 1 });
    });

    it('чужой формат отклоняется', () => {
        expect(upgrade({ foo: 1 })).toEqual({ ok: false, error: 'unknown' });
        expect(upgrade(null)).toEqual({ ok: false, error: 'unknown' });
    });

    it('текущая версия проходит без обновления', () => {
        const { report, snapshot } = ok({ app: 'nextup', version: 2, exportedAt: 5, notes: [] });
        expect(report).toMatchObject({ fromVersion: 2, upgraded: false, invalid: 0 });
        expect(snapshot.exportedAt).toBe(5);
    });
});

describe('v1 → v2', () => {
    const { snapshot, report } = ok(v1);
    const byId = new Map(snapshot.notes.map((n) => [n.id, n]));

    it('отчёт', () => {
        expect(report).toMatchObject({ fromVersion: 1, toVersion: 2, upgraded: true });
        expect(report.invalid).toBe(1); // запись без id
    });

    it('простая заметка', () => {
        const n = byId.get('t-1')!;
        expect(n).toMatchObject({ due: '2026-10-20', body: 'Купить молоко #дом', repeat: null, doneAt: null, deletedAt: null });
        expect(n.items.map((i) => i.text)).toEqual(['хлеб', 'сыр']);
        expect(n.items[0]!.doneAt).toBe(Date.parse('2026-10-18T09:30:00.000Z'));
        expect(n.items[1]!.doneAt).toBeNull();
    });

    it('повторы получают детерминированные id и одну серию, дубли склеиваются', () => {
        const rent = snapshot.notes.filter((n) => n.repeat);
        expect(rent).toHaveLength(2);
        expect(new Set(rent.map((n) => n.repeat!.series)).size).toBe(1);
        for (const n of rent) expect(n.id).toBe(`${n.repeat!.series}@${n.due}`);
        expect(rent.find((n) => n.due === '2026-10-31')!.doneAt).not.toBeNull(); // победила запись с большим updatedAt
        expect(rent[0]!.repeat).toMatchObject({ every: 1, unit: 'month', anchor: '2026-08-31' });
    });

    it('миграция повторяема: тот же файл даёт те же id', () => {
        expect(ok(v1).snapshot.notes.map((n) => n.id)).toEqual(snapshot.notes.map((n) => n.id));
    });
});

describe('legacy → v2', () => {
    const { snapshot, report } = ok(legacy);

    it('отчёт', () => {
        expect(report).toMatchObject({ fromVersion: 0, toVersion: 2, upgraded: true, invalid: 2 });
    });

    it('пустые пункты отброшены, время отметки разобрано', () => {
        const n = snapshot.notes.find((x) => x.id === 'a1')!;
        expect(n.due).toBe('2026-10-05');
        expect(n.items).toHaveLength(1);
        expect(n.items[0]!.doneAt).not.toBeNull();
    });

    it('копии повтора образуют одну серию с самой ранней опорной датой', () => {
        const vitamins = snapshot.notes.filter((n) => n.body === 'Витамины');
        expect(vitamins).toHaveLength(3);
        expect(new Set(vitamins.map((n) => n.repeat!.series)).size).toBe(1);
        expect(vitamins[0]!.repeat!.anchor).toBe('2026-10-01');
    });

    it('после нормализации серия продолжается без дублей', () => {
        const today = '2026-10-10';
        const result = normalize(snapshot.notes, today, 0).filter((n) => n.body === 'Витамины');
        const dues = result.map((n) => n.due);
        expect(new Set(dues).size).toBe(dues.length);
        expect(dues[0]).toBe('2026-10-01');
        expect(dues.at(-1)).toBe('2026-10-10');
    });
});

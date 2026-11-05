import { describe, expect, it } from 'vitest';
import { editorKey, formatRoute, HOME, parseRoute, type Route } from '@/core/route';

describe('адрес в хеше', () => {
    it('разделы', () => {
        expect(parseRoute('')).toEqual(HOME);
        expect(parseRoute('#')).toEqual(HOME);
        expect(parseRoute('#/')).toEqual(HOME);
        expect(parseRoute('#/archive')).toEqual({ section: 'archive', editor: null });
        expect(parseRoute('#/trash')).toEqual({ section: 'trash', editor: null });
        expect(parseRoute('#/settings')).toEqual({ section: 'settings', editor: null });
    });

    it('заметка: чтение, правка, клон, новая; в «Скоро» раздел не пишется', () => {
        expect(parseRoute('#/note/abc')).toEqual({ section: 'active', editor: { mode: 'read', id: 'abc' } });
        expect(parseRoute('#/note/abc/edit')).toEqual({ section: 'active', editor: { mode: 'edit', id: 'abc' } });
        expect(parseRoute('#/archive/note/abc/clone')).toEqual({ section: 'archive', editor: { mode: 'clone', id: 'abc' } });
        expect(parseRoute('#/new')).toEqual({ section: 'active', editor: { mode: 'create' } });
        expect(parseRoute('#/archive/new')).toEqual({ section: 'archive', editor: { mode: 'create' } });
    });

    it('собирается обратно в ту же строку', () => {
        const routes: Route[] = [
            HOME,
            { section: 'archive', editor: null },
            { section: 'settings', editor: null },
            { section: 'active', editor: { mode: 'read', id: 'abc' } },
            { section: 'trash', editor: { mode: 'edit', id: 'abc' } },
            { section: 'archive', editor: { mode: 'clone', id: 'abc' } },
            { section: 'active', editor: { mode: 'create' } },
        ];
        for (const route of routes) expect(parseRoute(formatRoute(route))).toEqual(route);
        expect(formatRoute(HOME)).toBe('#/');
        expect(formatRoute({ section: 'active', editor: { mode: 'read', id: 'abc' } })).toBe('#/note/abc');
        expect(formatRoute({ section: 'archive', editor: { mode: 'edit', id: 'abc' } })).toBe('#/archive/note/abc/edit');
    });

    it('идентификатор с необычными символами кодируется', () => {
        const route: Route = { section: 'active', editor: { mode: 'read', id: 'a/b c#d' } };
        expect(parseRoute(formatRoute(route))).toEqual(route);
    });

    it('мусор не ломает: даёт «Скоро» без заметки', () => {
        expect(parseRoute('#/nonsense')).toEqual(HOME);
        expect(parseRoute('#/note')).toEqual(HOME);
        expect(parseRoute('#/note/abc/dance')).toEqual(HOME);
        expect(parseRoute('#/note/abc/edit/extra')).toEqual(HOME);
        expect(parseRoute('#/archive/whatever')).toEqual({ section: 'archive', editor: null });
        expect(parseRoute('#/%E0%A4%A')).toEqual(HOME);
    });

    it('у настроек заметки нет', () => {
        expect(parseRoute('#/settings/note/abc')).toEqual({ section: 'settings', editor: null });
        expect(formatRoute({ section: 'settings', editor: { mode: 'create' } })).toBe('#/settings');
    });

    it('ключ редактора различает режим и заметку', () => {
        expect(editorKey(null)).toBe('');
        expect(editorKey({ mode: 'create' })).toBe('create');
        expect(editorKey({ mode: 'read', id: 'a' })).not.toBe(editorKey({ mode: 'edit', id: 'a' }));
        expect(editorKey({ mode: 'read', id: 'a' })).not.toBe(editorKey({ mode: 'read', id: 'b' }));
    });
});

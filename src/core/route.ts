/**
 * Адрес приложения в хеше: раздел и, если открыта заметка, она.
 *
 *   #/                      Скоро
 *   #/archive, #/trash      разделы
 *   #/settings              настройки
 *   #/note/<id>             чтение заметки (в «Скоро»); в другом разделе — #/archive/note/<id>
 *   #/note/<id>/edit        правка; #/note/<id>/clone — клонирование
 *   #/new                   новая заметка
 *
 * Хеш не требует настройки сервера и работает в любой подпапке сайта. Здесь только разбор и сборка строки.
 */
export const SECTIONS = ['active', 'archive', 'trash', 'settings'] as const;
export type Section = (typeof SECTIONS)[number];
/** Раздел со списком заметок: у настроек списка нет. */
export type ListSection = Exclude<Section, 'settings'>;

export type EditorRoute = { mode: 'create' } | { mode: 'read' | 'edit' | 'clone'; id: string };

export interface Route {
    section: Section;
    editor: EditorRoute | null;
}

export const HOME: Route = { section: 'active', editor: null };

const isSection = (value: string | undefined): value is Section => !!value && (SECTIONS as readonly string[]).includes(value);

function decode(part: string): string {
    try {
        return decodeURIComponent(part);
    } catch {
        return part;
    }
}

/** Терпимый разбор: всё непонятное даёт «Скоро» без заметки, а не ошибку. У настроек заметки нет. */
export function parseRoute(hash: string): Route {
    const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decode);
    let section: Section = 'active';
    let rest = parts;
    if (isSection(parts[0])) {
        section = parts[0];
        rest = parts.slice(1);
    }
    if (section === 'settings') return { section, editor: null };

    if (rest.length === 1 && rest[0] === 'new') return { section, editor: { mode: 'create' } };
    if (rest[0] === 'note' && rest[1] && rest.length <= 3) {
        const mode = rest[2] === undefined ? 'read' : rest[2] === 'edit' || rest[2] === 'clone' ? rest[2] : null;
        if (mode) return { section, editor: { mode, id: rest[1] } };
    }
    return { section, editor: null };
}

/** Строка хеша для маршрута; для одного маршрута всегда одна и та же, поэтому по ней сравнивают. */
export function formatRoute({ section, editor }: Route): string {
    const base = section === 'active' ? '' : section;
    if (!editor || section === 'settings') return `#/${base}`;
    const tail = editor.mode === 'create' ? 'new' : `note/${encodeURIComponent(editor.id)}${editor.mode === 'read' ? '' : `/${editor.mode}`}`;
    return `#/${base ? `${base}/` : ''}${tail}`;
}

/** Один и тот же редактор (режим и заметка): по нему решают, перерисовывать ли окно. */
export function editorKey(editor: EditorRoute | null): string {
    return !editor ? '' : editor.mode === 'create' ? 'create' : `${editor.mode}:${editor.id}`;
}

import type { Note } from './model';

/**
 * Хештеги `#работа` в тексте. Это не отдельная сущность, а часть текста. Тег — `#` в начале строки или после
 * пробела/скобки и слово из букв, цифр, `_` и `-` хотя бы с одной буквой: `#12` и якоря ссылок (`/page#top`) не теги.
 */
const TAG_CHAR = /[\p{L}\p{N}_-]/u;
const TAG_LEADING = /[\s(\[{«"']/u;

/** Тег, начинающийся в `src[start]`: его имя (без `#`) или `null`. Правило общее для индекса и разметки Markdown. */
export function scanTag(src: string, start: number, end = src.length): string | null {
    if (src.charCodeAt(start) !== 0x23 /* # */) return null;
    if (start > 0 && !TAG_LEADING.test(src[start - 1]!)) return null;

    let stop = start + 1;
    while (stop < end && TAG_CHAR.test(src[stop]!)) stop++;
    const name = src.slice(start + 1, stop).replace(/-+$/, '');
    return /\p{L}/u.test(name) ? name : null;
}

export function extractTags(body: string): string[] {
    const found: string[] = [];
    for (let i = body.indexOf('#'); i !== -1; i = body.indexOf('#', i + 1)) {
        const name = scanTag(body, i);
        if (name) found.push(name);
    }
    return found;
}

export interface TagCount {
    /** Как написан впервые. */
    name: string;
    count: number;
}

/** Индекс «тег → сколько заметок»; регистр не различается, считается заметка, а не вхождение. */
export function tagIndex(notes: readonly Pick<Note, 'body'>[]): TagCount[] {
    const map = new Map<string, TagCount>();
    for (const note of notes) {
        for (const key of new Set(extractTags(note.body).map((tag) => tag.toLocaleLowerCase()))) {
            const entry = map.get(key);
            if (entry) entry.count++;
            else map.set(key, { name: extractTags(note.body).find((tag) => tag.toLocaleLowerCase() === key)!, count: 1 });
        }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

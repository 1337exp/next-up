/**
 * Форматирование Markdown в поле ввода: чистые функции «текст + выделение → новый текст + выделение».
 * Ни DOM, ни Vue: поле только передаёт сюда текст и границы выделения и применяет результат.
 */

export type MdAction = 'bold' | 'italic' | 'code' | 'list' | 'quote' | 'link';

export interface MdEdit {
    text: string;
    /** Новое выделение (при пустом — позиция курсора). */
    start: number;
    end: number;
}

const WRAP: Partial<Record<MdAction, string>> = { bold: '**', italic: '*', code: '`' };
const PREFIX: Partial<Record<MdAction, string>> = { list: '- ', quote: '> ' };

/** Обернуть выделение в `marker` или снять обёртку, если она уже есть (снаружи выделения или внутри него). */
function toggleWrap(text: string, start: number, end: number, marker: string): MdEdit {
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    const n = marker.length;

    // `*текст*` внутри `**текст**` — это не курсив, а часть жирного: курсив тогда добавляется поверх;
    // а вот в `***текст***` курсив уже есть, и его можно снять
    const strongAround = marker === '*' && before.endsWith('**') && after.startsWith('**') && !(before.endsWith('***') && after.startsWith('***'));

    if (before.endsWith(marker) && after.startsWith(marker) && !strongAround) {
        return { text: before.slice(0, -n) + selected + after.slice(n), start: start - n, end: end - n };
    }
    if (selected.length >= 2 * n && selected.startsWith(marker) && selected.endsWith(marker) && !(marker === '*' && selected.startsWith('**') && !selected.startsWith('***'))) {
        const inner = selected.slice(n, -n);
        return { text: before + inner + after, start, end: start + inner.length };
    }
    return { text: before + marker + selected + marker + after, start: start + n, end: end + n };
}

/** Добавить `prefix` строкам выделения или снять его, если он уже есть у всех непустых строк. */
function togglePrefix(text: string, start: number, end: number, prefix: string): MdEdit {
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    // выделение, оканчивающееся сразу после перевода строки, следующую строку не захватывает
    const lastChar = end > start ? end - 1 : end;
    const nextBreak = text.indexOf('\n', lastChar);
    const lineEnd = nextBreak === -1 ? text.length : nextBreak;

    const lines = text.slice(lineStart, lineEnd).split('\n');
    const filled = lines.filter((line) => line !== '');
    const remove = filled.length > 0 && filled.every((line) => line.startsWith(prefix));

    let firstDelta = 0;
    let total = 0;
    const next = lines.map((line, index) => {
        if (line === '' && lines.length > 1) return line; // пустые строки внутри выделения оставляем пустыми
        const changed = remove ? line.slice(prefix.length) : prefix + line;
        const delta = changed.length - line.length;
        if (index === 0) firstDelta = delta;
        total += delta;
        return changed;
    });

    return { text: text.slice(0, lineStart) + next.join('\n') + text.slice(lineEnd), start: Math.max(lineStart, start + firstDelta), end: end + total };
}

/** `[текст](адрес)`: выделение становится текстом, а выделенным остаётся адрес; адрес в выделении — наоборот. */
function makeLink(text: string, start: number, end: number): MdEdit {
    const selected = text.slice(start, end);
    const before = text.slice(0, start);
    const after = text.slice(end);

    if (/^https?:\/\/\S+$/.test(selected)) {
        return { text: `${before}[](${selected})${after}`, start: start + 1, end: start + 1 };
    }
    if (selected === '') return { text: `${before}[](url)${after}`, start: start + 1, end: start + 1 };
    const placeholder = 'url';
    const link = `[${selected}](${placeholder})`;
    const urlStart = start + selected.length + 3; // «[» + текст + «](»
    return { text: before + link + after, start: urlStart, end: urlStart + placeholder.length };
}

export function applyMarkdown(action: MdAction, text: string, start: number, end: number): MdEdit {
    const [from, to] = start <= end ? [start, end] : [end, start];
    const wrap = WRAP[action];
    if (wrap) return toggleWrap(text, from, to, wrap);
    const prefix = PREFIX[action];
    if (prefix) return togglePrefix(text, from, to, prefix);
    return makeLink(text, from, to);
}

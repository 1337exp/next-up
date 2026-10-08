import MarkdownIt from 'markdown-it';

/**
 * Заметки пишет пользователь, а результат вставляется через v-html, поэтому:
 * - сырой HTML выключен (`html: false`): теги показываются как текст;
 * - markdown-it сам отбрасывает ссылки `javascript:`, `vbscript:`, `file:`;
 * - картинки выключены, чтобы заметка не делала сетевых запросов;
 * - внешние ссылки открываются в новой вкладке без доступа к `window.opener`.
 */
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });
md.disable('image');

const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx]!;
    token.attrSet('target', '_blank');
    token.attrSet('rel', 'noopener noreferrer');
    return defaultLinkOpen(tokens, idx, options, env, self);
};

/**
 * Хештеги `#работа` в тексте заметки. Это не отдельная сущность, а часть текста: в данных, импорте и поиске
 * ничего не меняется. Тег — это `#` в начале строки или после пробела/скобки и слово из букв, цифр, `_` и `-`
 * хотя бы с одной буквой: `#12` и якоря ссылок вроде `/page#top` тегами не считаются.
 */
const TAG_CHAR = /[\p{L}\p{N}_-]/u;
const TAG_LEADING = /[\s(\[{«"']/u;

md.inline.ruler.before('link', 'hashtag', (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x23 /* # */) return false;
    if (start > 0 && !TAG_LEADING.test(state.src[start - 1]!)) return false;

    let end = start + 1;
    while (end < state.posMax && TAG_CHAR.test(state.src[end]!)) end++;
    const name = state.src.slice(start + 1, end).replace(/-+$/, '');
    if (!/\p{L}/u.test(name)) return false;

    if (!silent) {
        const token = state.push('hashtag', '', 0);
        token.content = name;
    }
    state.pos = start + 1 + name.length;
    return true;
});

md.renderer.rules.hashtag = (tokens, idx) => {
    const name = md.utils.escapeHtml(tokens[idx]!.content);
    return `<button type="button" class="hashtag" data-tag="${name}">#${name}</button>`;
};

export function renderMarkdown(text: string): string {
    return md.render(text);
}

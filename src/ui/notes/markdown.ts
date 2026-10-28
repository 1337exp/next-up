import MarkdownIt from 'markdown-it';
import { scanTag } from '@/core/tags';

/**
 * Текст пишет пользователь, а результат вставляется через v-html, поэтому:
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

// хештеги: правило разбора общее с индексом тегов (core/tags.ts)
md.inline.ruler.before('link', 'hashtag', (state, silent) => {
    const name = scanTag(state.src, state.pos, state.posMax);
    if (!name) return false;
    if (!silent) state.push('hashtag', '', 0).content = name;
    state.pos += 1 + name.length;
    return true;
});

md.renderer.rules.hashtag = (tokens, idx) => {
    const name = md.utils.escapeHtml(tokens[idx]!.content);
    return `<button type="button" class="hashtag" data-tag="${name}">#${name}</button>`;
};

export function renderMarkdown(text: string): string {
    return md.render(text);
}

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

export function renderMarkdown(text: string): string {
    return md.render(text);
}

import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '@/lib/markdown';

describe('Markdown в заметках', () => {
    it('базовая разметка работает', () => {
        expect(renderMarkdown('**жирный**')).toContain('<strong>жирный</strong>');
        expect(renderMarkdown('- a\n- b')).toContain('<li>b</li>');
        expect(renderMarkdown('строка 1\nстрока 2')).toContain('<br>');
    });

    it('сырой HTML и скрипты показываются как текст, а не исполняются', () => {
        const html = renderMarkdown('<script>alert(1)</script> <img src=x onerror=alert(1)> <b>x</b>');
        expect(html).not.toContain('<script');
        expect(html).not.toContain('<img');
        expect(html).not.toContain('<b>');
        expect(html).toContain('&lt;script&gt;');
    });

    it('ссылки javascript: и data: не становятся ссылками', () => {
        for (const url of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html;base64,AAAA', 'vbscript:x']) {
            expect(renderMarkdown(`[клик](${url})`), url).not.toContain('<a ');
        }
    });

    it('внешние ссылки открываются в новой вкладке без доступа к opener', () => {
        for (const source of ['[сайт](https://example.com)', 'https://example.com']) {
            const html = renderMarkdown(source);
            expect(html, source).toContain('href="https://example.com"');
            expect(html, source).toContain('target="_blank"');
            expect(html, source).toContain('rel="noopener noreferrer"');
        }
    });

    it('картинки не загружаются: заметка не делает сетевых запросов', () => {
        const html = renderMarkdown('![alt](https://tracker.example/pixel.png)');
        expect(html).not.toContain('<img');
        expect(html).not.toContain('src=');
    });
});

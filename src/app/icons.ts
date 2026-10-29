import { registerTaoIcons } from '@1337exp/taoui';

/**
 * Иконки панели Markdown, которых нет среди встроенных в TaoUI (сетка 24, линия `currentColor`; формы в духе Lucide, ISC).
 * Кандидаты на переезд в TaoUI.
 */
export function registerAppIcons(): void {
    registerTaoIcons({
        code: { body: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>' },
        list: { body: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>' },
        quote: { body: '<path d="M5 5v14M10 8h9M10 12h9M10 16h6"/>' },
        link: { body: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>' },
    });
}

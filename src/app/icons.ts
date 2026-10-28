import { registerTaoIcons } from '@1337exp/taoui';

/**
 * Прикладные иконки, которых нет среди встроенных (сетка 24, линия `currentColor`; формы в духе Lucide, ISC).
 * Кандидаты на переезд в TaoUI, см. docs/PLAN-v3.md §11.
 */
export function registerAppIcons(): void {
    registerTaoIcons({
        settings: { body: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>' },
        edit: { body: '<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>' },
        trash: { body: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>' },
        repeat: { body: '<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>' },
        undo: { body: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>' },
        redo: { body: '<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>' },
        tag: { body: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1"/>' },
        notes: { body: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>' },
    });
}

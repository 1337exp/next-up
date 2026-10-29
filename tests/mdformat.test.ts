import { describe, expect, it } from 'vitest';
import { applyMarkdown, type MdAction } from '@/core/mdFormat';

/** Текст с выделением `⟦…⟧` → результат в том же виде: так видно и текст, и куда встало выделение. */
function run(action: MdAction, marked: string): string {
    const start = marked.indexOf('⟦');
    const end = marked.indexOf('⟧') - 1;
    const text = marked.replace('⟦', '').replace('⟧', '');
    const edit = applyMarkdown(action, text, start, end);
    return edit.text.slice(0, edit.start) + '⟦' + edit.text.slice(edit.start, edit.end) + '⟧' + edit.text.slice(edit.end);
}

describe('жирный, курсив, код', () => {
    it('оборачивает выделение и оставляет его выделенным', () => {
        expect(run('bold', 'это ⟦слово⟧ тут')).toBe('это **⟦слово⟧** тут');
        expect(run('italic', 'это ⟦слово⟧')).toBe('это *⟦слово⟧*');
        expect(run('code', '⟦x = 1⟧')).toBe('`⟦x = 1⟧`');
    });

    it('без выделения ставит пару и курсор между', () => {
        expect(run('bold', 'а ⟦⟧ б')).toBe('а **⟦⟧** б');
    });

    it('повторное нажатие снимает обёртку: и снаружи выделения, и внутри него', () => {
        expect(run('bold', 'это **⟦слово⟧** тут')).toBe('это ⟦слово⟧ тут');
        expect(run('bold', 'это ⟦**слово**⟧ тут')).toBe('это ⟦слово⟧ тут');
        expect(run('code', '`⟦x⟧`')).toBe('⟦x⟧');
    });

    it('курсив поверх жирного добавляется, а не отнимает звёздочку у жирного', () => {
        expect(run('italic', '**⟦слово⟧**')).toBe('***⟦слово⟧***');
        expect(run('italic', '⟦**слово**⟧')).toBe('*⟦**слово**⟧*');
    });

    it('жирный и курсив вместе снимаются по очереди', () => {
        expect(run('italic', '***⟦слово⟧***')).toBe('**⟦слово⟧**');
    });

    it('выделение, заданное справа налево, работает так же', () => {
        const edit = applyMarkdown('bold', 'abc def', 7, 4);
        expect(edit.text).toBe('abc **def**');
    });
});

describe('список и цитата', () => {
    it('ставит маркер строке с курсором, даже без выделения', () => {
        expect(run('list', 'первая\nвто⟦⟧рая')).toBe('первая\n- вто⟦⟧рая');
    });

    it('и каждой строке выделения; выделение сохраняется', () => {
        expect(run('list', '⟦один\nдва⟧\nтри')).toBe('- ⟦один\n- два⟧\nтри');
        expect(run('quote', 'x\n⟦а\nб⟧')).toBe('x\n> ⟦а\n> б⟧');
    });

    it('если маркер уже у всех строк, снимает его', () => {
        expect(run('list', '- ⟦один\n- два⟧')).toBe('⟦один\nдва⟧');
    });

    it('пустые строки внутри выделения не получают маркер', () => {
        expect(run('list', '⟦а\n\nб⟧')).toBe('- ⟦а\n\n- б⟧');
    });

    it('выделение, оканчивающееся переводом строки, следующую строку не трогает', () => {
        const edit = applyMarkdown('list', 'а\nб\nв', 0, 4); // «а\nб\n»
        expect(edit.text).toBe('- а\n- б\nв');
    });

    it('список и цитата не мешают друг другу', () => {
        expect(run('quote', '- ⟦а⟧')).toBe('> - ⟦а⟧'); // вложенный список в цитате: выделение остаётся на тексте
    });
});

describe('ссылка', () => {
    it('выделенный текст становится текстом ссылки, а выделенным остаётся адрес', () => {
        expect(run('link', 'см. ⟦сайт⟧ тут')).toBe('см. [сайт](⟦url⟧) тут');
    });

    it('без выделения: пустая ссылка, курсор в скобках текста', () => {
        expect(run('link', '⟦⟧')).toBe('[⟦⟧](url)');
    });

    it('без выделения среди текста: текст вокруг не теряется', () => {
        expect(run('link', 'до ⟦⟧ после')).toBe('до [⟦⟧](url) после');
    });

    it('выделенный адрес становится адресом, курсор в тексте', () => {
        expect(run('link', '⟦https://example.com/a⟧')).toBe('[⟦⟧](https://example.com/a)');
    });
});

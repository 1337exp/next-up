import { describe, expect, it } from 'vitest';
import { filterByQuery, isSearchable, matchesQuery, normalizeForSearch } from '@/domain/search';
import { makeTask } from '../helpers';

const task = makeTask({
    date: '2026-10-20',
    note: 'Купить Хлеб и молоко\n\nСходить в «Ёлочку»',
    checklist: [{ text: 'Позвонить маме', done: false, changedAt: null }, { text: 'Оплатить интернет', done: true, changedAt: null }],
});

describe('быстрый поиск', () => {
    it('пустой запрос подходит всем', () => {
        for (const q of ['', '   ', '\n']) expect(matchesQuery(task, q), JSON.stringify(q)).toBe(true);
    });

    it('без учёта регистра, по части слова', () => {
        expect(matchesQuery(task, 'хлеб')).toBe(true);
        expect(matchesQuery(task, 'ХЛЕБ')).toBe(true);
        expect(matchesQuery(task, 'млек')).toBe(false); // «молоко», не «млек»
        expect(matchesQuery(task, 'олок')).toBe(true);
    });

    it('«е» и «ё» не различаются в обе стороны', () => {
        expect(matchesQuery(task, 'елочку')).toBe(true);
        expect(matchesQuery(makeTask({ note: 'Мёд' }), 'мед')).toBe(true);
        expect(matchesQuery(makeTask({ note: 'Мед' }), 'мёд')).toBe(true);
    });

    it('ищет и по пунктам списка, в том числе отмеченным', () => {
        expect(matchesQuery(task, 'маме')).toBe(true);
        expect(matchesQuery(task, 'интернет')).toBe(true);
    });

    it('ищет по дате в виде dd.mm.yyyy и по её части', () => {
        expect(matchesQuery(task, '20.10.2026')).toBe(true);
        expect(matchesQuery(task, '.10.')).toBe(true);
        expect(matchesQuery(task, '21.10')).toBe(false);
    });

    it('несколько слов: все должны встретиться, порядок не важен, слова могут быть в заметке и в пунктах', () => {
        expect(matchesQuery(task, 'хлеб молоко')).toBe(true);
        expect(matchesQuery(task, 'молоко хлеб')).toBe(true);
        expect(matchesQuery(task, 'хлеб маме')).toBe(true);
        expect(matchesQuery(task, 'хлеб яблоки')).toBe(false);
        expect(matchesQuery(task, '  хлеб    молоко  ')).toBe(true);
    });

    it('спецсимволы запроса не ломают поиск (это не регулярное выражение)', () => {
        for (const q of ['(', '[', '.*', '\\', '+?', '$^']) expect(() => matchesQuery(task, q), q).not.toThrow();
        expect(matchesQuery(makeTask({ note: 'цена (в руб.)' }), '(в руб.)')).toBe(true);
    });

    it('filterByQuery сохраняет порядок и не меняет исходный массив', () => {
        const list = [makeTask({ note: 'яблоко' }), makeTask({ note: 'груша' }), makeTask({ note: 'яблочный пирог' })];
        expect(filterByQuery(list, 'яблок', { exact: true }).map((t) => t.note)).toEqual(['яблоко']);
        expect(filterByQuery(list, 'ябл').map((t) => t.note)).toEqual(['яблоко', 'яблочный пирог']); // порядок как в списке
        expect(filterByQuery(list, '')).toHaveLength(3);
        expect(filterByQuery(list, '')).not.toBe(list);
        expect(list).toHaveLength(3);
    });

    it('запрос короче 2 символов не фильтрует', () => {
        expect(isSearchable('я')).toBe(false);
        expect(isSearchable(' я ')).toBe(false);
        expect(isSearchable('яб')).toBe(true);
        expect(matchesQuery(task, 'ъ')).toBe(true);
        expect(filterByQuery([makeTask({ note: 'а' }), makeTask({ note: 'б' })], 'в')).toHaveLength(2);
    });

    it('нечёткий поиск прощает опечатки: замену, пропуск, лишнюю и переставленную букву', () => {
        for (const q of ['молко', 'малоко', 'молооко', 'молого', 'млоко', 'хлбе']) expect(matchesQuery(task, q), q).toBe(true);
        expect(matchesQuery(task, 'интрнет маме')).toBe(true);
    });

    it('нечёткий поиск не шумит: короткие слова точные, разные слова не склеиваются', () => {
        expect(matchesQuery(makeTask({ note: 'кит' }), 'кот')).toBe(false);
        expect(matchesQuery(task, 'яблоко')).toBe(false);
        expect(matchesQuery(task, 'молоко яблоко')).toBe(false);
    });

    it('опечатка в начатом слове: сравнивается с началом слова заметки', () => {
        expect(matchesQuery(task, 'интрен')).toBe(true);
    });

    it('exact отключает нечёткость, но оставляет поиск подстроки', () => {
        expect(matchesQuery(task, 'молко', { exact: true })).toBe(false);
        expect(matchesQuery(task, 'олок', { exact: true })).toBe(true);
        expect(filterByQuery([makeTask({ note: 'молоко' })], 'молко', { exact: true })).toHaveLength(0);
    });

    it('запрос с # — это хештег: ищется как есть, без поправки на опечатки и без слова без решётки', () => {
        const tagged = makeTask({ note: 'Позвонить #работа завтра' });
        expect(matchesQuery(tagged, '#работа')).toBe(true);
        expect(matchesQuery(tagged, '#раб')).toBe(true); // пока набирается
        expect(matchesQuery(tagged, '#рабата')).toBe(false); // опечатка в теге не прощается
        expect(matchesQuery(makeTask({ note: 'Много работы' }), '#работа')).toBe(false);
    });

    it('normalizeForSearch', () => {
        expect(normalizeForSearch('ЁЖИК Ёлка')).toBe('ежик елка');
    });
});

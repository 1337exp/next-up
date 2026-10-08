import { formatUserDate } from './date';
import type { Task } from './types';

/** Без регистра и без различия «е» / «ё»: так ищут по-русски. */
export function normalizeForSearch(text: string): string {
    return text.toLocaleLowerCase().replace(/ё/g, 'е');
}

/** Запрос короче этого не фильтрует список: один символ подходит почти всему, а пересчёт зря. */
export const MIN_QUERY_LENGTH = 2;

export interface SearchOptions {
    /** Только точное вхождение подстроки, без поправки на опечатки. */
    exact?: boolean;
}

/** Запрос достаточно длинный, чтобы по нему искать. */
export function isSearchable(query: string): boolean {
    return query.trim().length >= MIN_QUERY_LENGTH;
}

/** Сколько опечаток прощаем слову: короткие слова — никаких, иначе «кот» находит «кит», «рот» и «год». */
function allowedTypos(length: number): number {
    if (length < 4) return 0;
    return length < 8 ? 1 : 2;
}

/** Расстояние Дамерау — Левенштейна (замена, вставка, удаление и перестановка соседних букв) с ранним выходом по `max`. */
function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev2: number[] = [];
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        let best = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let d = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2]! + 1);
            row.push(d);
            best = Math.min(best, d);
        }
        if (best > max) return max + 1;
        prev2 = prev;
        prev = row;
    }
    return prev[b.length]!;
}

function fuzzyHas(tokens: readonly string[], word: string): boolean {
    const max = allowedTypos(word.length);
    if (max === 0) return false;
    // сравниваем и с целым словом, и с его началом той же длины: запрос ещё набирается («хлеб» → «хлебобулочные»)
    return tokens.some((token) => editDistance(word, token, max) <= max || (token.length > word.length && editDistance(word, token.slice(0, word.length), max) <= max));
}

/**
 * Быстрый поиск: все слова запроса должны встретиться (в любом порядке) в заметке, пунктах списка
 * или дате в виде `dd.mm.yyyy`. По умолчанию слово находится и с опечаткой («молко» → «молоко»),
 * с `exact` — только как подстрока. Пустой или слишком короткий запрос подходит всем задачам.
 */
export function matchesQuery(task: Pick<Task, 'note' | 'checklist' | 'date'>, query: string, { exact = false }: SearchOptions = {}): boolean {
    if (!isSearchable(query)) return true;
    const words = normalizeForSearch(query).split(/\s+/).filter(Boolean);

    const haystack = normalizeForSearch([task.note, ...task.checklist.map((item) => item.text), formatUserDate(task.date)].join('\n'));
    let tokens: string[] | null = null; // считаем лениво: при точном совпадении не нужны
    return words.every((word) => {
        if (haystack.includes(word)) return true;
        if (exact) return false;
        tokens ??= haystack.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
        return fuzzyHas(tokens, word);
    });
}

export function filterByQuery<T extends Pick<Task, 'note' | 'checklist' | 'date'>>(tasks: readonly T[], query: string, options: SearchOptions = {}): T[] {
    return isSearchable(query) ? tasks.filter((task) => matchesQuery(task, query, options)) : [...tasks];
}

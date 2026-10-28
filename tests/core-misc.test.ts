import { describe, expect, it } from 'vitest';
import { parseUserDate } from '@/core/date';
import { mergeNotes } from '@/core/merge';
import { cloneInput, createNote, removeNote, toggleItem, updateNote } from '@/core/notes';
import { filterByQuery, matchesQuery } from '@/core/search';
import { extractTags, tagIndex } from '@/core/tags';
import { diffEntry, UndoStack } from '@/core/undo';
import { item, note } from './helpers';

const TODAY = '2026-10-10';

describe('создание и правка', () => {
  const input = { due: TODAY, body: ' текст ', items: [item('i', ' пункт '), item('e', '  ')], repeat: null };

  it('чистит текст и пустые пункты', () => {
    const r = createNote(input, TODAY, 5, 'n1');
    expect(r.ok && r.note).toMatchObject({ id: 'n1', body: 'текст', createdAt: 5, updatedAt: 5 });
    expect(r.ok && r.note.items.map((i) => i.text)).toEqual(['пункт']);
  });

  it('ошибки проверки', () => {
    expect(createNote({ ...input, due: '2026-02-31' }, TODAY, 1)).toEqual({ ok: false, error: 'badDate' });
    expect(createNote({ ...input, body: '', items: [] }, TODAY, 1)).toEqual({ ok: false, error: 'empty' });
    expect(createNote({ ...input, due: '2025-01-01' }, TODAY, 1)).toEqual({ ok: false, error: 'tooOld' });
    expect(createNote({ ...input, repeat: { every: 0, unit: 'day' } }, TODAY, 1)).toEqual({ ok: false, error: 'badRepeat' });
  });

  it('повтор: серия начинается с самой заметки', () => {
    const r = createNote({ ...input, repeat: { every: 2, unit: 'week' } }, TODAY, 1, 'n1');
    expect(r.ok && r.note.repeat).toEqual({ every: 2, unit: 'week', series: 'n1', anchor: TODAY });
  });

  it('правка без смены срока и правила сохраняет серию, со сменой — начинает заново', () => {
    const made = createNote({ ...input, repeat: { every: 1, unit: 'day' } }, TODAY, 1, 'n1');
    if (!made.ok) throw new Error();
    const same = updateNote(made.note, { ...input, body: 'другой', repeat: { every: 1, unit: 'day' } }, TODAY, 2);
    expect(same.ok && same.note.repeat).toEqual(made.note.repeat);
    const moved = updateNote(made.note, { ...input, due: '2026-10-15', repeat: { every: 1, unit: 'day' } }, TODAY, 2);
    expect(moved.ok && moved.note.repeat).toMatchObject({ anchor: '2026-10-15' });
  });

  it('клон без отметок и без повтора', () => {
    const clone = cloneInput(note({ id: 'a', due: TODAY, items: [item('i', 'x', 9)] }));
    expect(clone.items[0]).toMatchObject({ text: 'x', doneAt: null });
    expect(clone.repeat).toBeNull();
  });

  it('отметка пункта ставит и снимает время', () => {
    const n = note({ id: 'a', due: TODAY, items: [item('i', 'x')] });
    const on = toggleItem(n, 'i', 100);
    expect(on.items[0]!.doneAt).toBe(100);
    expect(toggleItem(on, 'i', 200).items[0]!.doneAt).toBeNull();
    expect(toggleItem(n, 'nope', 1)).toBe(n);
  });
});

describe('слияние', () => {
  const a = note({ id: '1', due: TODAY, updatedAt: 10 });
  const newer = { ...a, body: 'новее', updatedAt: 20 };

  it('побеждает больший updatedAt, считает отчёт', () => {
    const { notes, report } = mergeNotes([a], [newer, note({ id: '2', due: TODAY })]);
    expect(notes.find((n) => n.id === '1')!.body).toBe('новее');
    expect(report).toEqual({ added: 1, updated: 1, skipped: 0 });
    expect(mergeNotes([newer], [a]).report.skipped).toBe(1);
  });

  it('при равных updatedAt удаление сильнее, и порядок слияния не важен', () => {
    const dead = removeNote(a, 10);
    const x = mergeNotes([a], [dead]).notes;
    const y = mergeNotes([dead], [a]).notes;
    expect(x[0]!.deletedAt).not.toBeNull();
    expect(y[0]!.deletedAt).not.toBeNull();
  });

  it('удаление позже правки побеждает, правка позже удаления воскрешает', () => {
    expect(mergeNotes([a], [removeNote(a, 15)]).notes[0]!.deletedAt).toBe(15);
    expect(mergeNotes([removeNote(a, 15)], [{ ...a, updatedAt: 30 }]).notes[0]!.deletedAt).toBeNull();
  });
});

describe('отмена', () => {
  const a = note({ id: 'a', due: TODAY });

  it('отмена и повтор по затронутым заметкам', () => {
    const stack = new UndoStack();
    const edited = { ...a, body: 'новое', updatedAt: 5 };
    const other = note({ id: 'o', due: TODAY });
    stack.record(diffEntry([a], [edited])!);

    const undone = stack.undo([edited, other], 100)!;
    expect(undone.find((n) => n.id === 'a')).toMatchObject({ body: 'заметка', updatedAt: 100 });
    expect(undone.find((n) => n.id === 'o')).toBe(other); // чужое не тронуто

    const redone = stack.redo(undone, 200)!;
    expect(redone.find((n) => n.id === 'a')).toMatchObject({ body: 'новое', updatedAt: 200 });
    expect(stack.redo(redone, 300)).toBeNull();
  });

  it('отмена создания помечает заметку удалённой, а не стирает', () => {
    const stack = new UndoStack();
    stack.record(diffEntry([], [a])!);
    expect(stack.undo([a], 50)![0]).toMatchObject({ deletedAt: 50, updatedAt: 50 });
  });

  it('новое действие сбрасывает «повтор», лимит обрезает старое', () => {
    const stack = new UndoStack(2);
    const v = (n: number) => ({ ...a, body: String(n) });
    stack.record(diffEntry([v(0)], [v(1)])!);
    stack.record(diffEntry([v(1)], [v(2)])!);
    stack.record(diffEntry([v(2)], [v(3)])!);
    stack.undo([v(3)], 1);
    stack.undo([v(2)], 1);
    expect(stack.canUndo).toBe(false);
    stack.redo([v(1)], 1);
    stack.record(diffEntry([v(2)], [v(9)])!);
    expect(stack.canRedo).toBe(false);
  });

  it('правки с одним ключом склеиваются в один шаг, с разными и после паузы — нет', () => {
    const stack = new UndoStack();
    const v = (n: number) => ({ ...a, body: String(n) });
    stack.record(diffEntry([v(0)], [v(1)])!, 'k', 1000);
    stack.record(diffEntry([v(1)], [v(2)])!, 'k', 2000);
    stack.record(diffEntry([v(2)], [v(3)])!, 'other', 2500);
    stack.record(diffEntry([v(3)], [v(4)])!, 'other', 9000);

    expect(stack.undo([v(4)], 1)![0]!.body).toBe('3');
    expect(stack.undo([v(3)], 1)![0]!.body).toBe('2');
    expect(stack.undo([v(2)], 1)![0]!.body).toBe('0'); // первые две правки — один шаг
    expect(stack.canUndo).toBe(false);
  });
  it('без изменений записи нет', () => {
    expect(diffEntry([a], [a])).toBeNull();
  });
});

describe('поиск и теги', () => {
  const n = note({ id: 'a', due: '2026-03-05', body: 'Купить молоко #дом', items: [item('i', 'хлеб')] });

  it('все слова в любом порядке, ё = е, опечатки', () => {
    expect(matchesQuery(n, 'молоко купить')).toBe(true);
    expect(matchesQuery(n, 'молко')).toBe(true);
    expect(matchesQuery(n, 'молко', { exact: true })).toBe(false);
    expect(matchesQuery(n, 'хлеб')).toBe(true);
    expect(matchesQuery(n, '05.03.2026')).toBe(true);
    expect(matchesQuery(n, 'кот')).toBe(false);
  });

  it('тег ищется как есть; короткий запрос не фильтрует', () => {
    expect(matchesQuery(n, '#дом')).toBe(true);
    expect(matchesQuery(n, '#дим')).toBe(false);
    expect(filterByQuery([n], 'а')).toHaveLength(1);
  });

  it('теги: правила и индекс', () => {
    expect(extractTags('#один и #Два, site.com/page#top #12 # заголовок (#три)')).toEqual(['один', 'Два', 'три']);
    const index = tagIndex([{ body: '#Дом #дом' }, { body: '#дом #работа' }]);
    expect(index).toEqual([{ name: 'Дом', count: 2 }, { name: 'работа', count: 1 }]);
  });
});

describe('быстрый ввод даты', () => {
  it('разбирает короткие формы и отвергает невозможные', () => {
    expect(parseUserDate('5', TODAY)).toBe('2026-10-05');
    expect(parseUserDate('5.3', TODAY)).toBe('2026-03-05');
    expect(parseUserDate('05.03.26', TODAY)).toBe('2026-03-05');
    expect(parseUserDate('31.02', TODAY)).toBeNull();
    expect(parseUserDate('abc', TODAY)).toBeNull();
  });
});

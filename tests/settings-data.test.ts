import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI, { TaoFileDrop } from '@1337exp/taoui';
import SettingsDrawer from '@/components/SettingsDrawer.vue';
import { FEATURES } from '@/features';
import { KEYS } from '@/storage/local';
import { MAX_IMPORT_BYTES } from '@/domain/transfer';
import { useTasksStore } from '@/stores/tasks';
import type { Task } from '@/domain/types';
import { makeTask } from './helpers';

const mocks = vi.hoisted(() => ({ answer: true, asked: [] as string[], toasts: [] as string[] }));

vi.mock('@1337exp/taoui', async (importOriginal) => {
    const original = await importOriginal<typeof import('@1337exp/taoui')>();
    const confirm = (title: string) => {
        mocks.asked.push(title);
        const builder: Record<string, unknown> = { then: (resolve: (value: boolean) => void) => resolve(mocks.answer) };
        for (const name of ['message', 'ok', 'cancel', 'danger']) {
            builder[name] = (value?: unknown) => {
                if (name === 'message') mocks.asked.push(String(value));
                return builder;
            };
        }
        return builder;
    };
    const toast = Object.assign(vi.fn(), {
        warning: (m: string) => void mocks.toasts.push(`warning: ${m}`),
        error: (m: string) => void mocks.toasts.push(`error: ${m}`),
        success: (m: string) => void mocks.toasts.push(`success: ${m}`),
    });
    return { ...original, confirm, toast };
});

const q = <T extends Element>(selector: string) => document.body.querySelector<T>(selector)!;
const file = (content: string, name = 'export.json') => new File([content], name, { type: 'application/json' });

function mountDrawer(tasks: Task[] = []) {
    localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale: 'ru' }));
    if (tasks.length) localStorage.setItem(KEYS.tasks, JSON.stringify({ schemaVersion: 1, tasks }));
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useTasksStore();
    const w = mount(SettingsDrawer, { props: { modelValue: true }, global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
    return { w, store };
}

const importFile = async (w: ReturnType<typeof mountDrawer>['w'], f: File) => {
    w.findComponent(TaoFileDrop).vm.$emit('files', [f]);
    await vi.waitFor(() => expect(mocks.toasts.length).toBeGreaterThan(0));
};

describe('настройки: данные', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        mocks.answer = true;
        mocks.asked.length = 0;
        mocks.toasts.length = 0;
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(2026, 9, 6, 12, 0, 0));
    });
    afterEach(() => vi.useRealTimers());

    describe('экспорт', () => {
        it('скачивает файл nextup-<дата>.json с текущими задачами', async () => {
            const tasks = [makeTask({ id: 'a', date: '2026-10-20', note: 'a' }), makeTask({ id: 'b', date: '2026-10-21', note: 'b' })];
            const { w } = mountDrawer(tasks);

            const created: Blob[] = [];
            const downloads: string[] = [];
            URL.createObjectURL = vi.fn((blob: Blob) => (created.push(blob), 'blob:test'));
            URL.revokeObjectURL = vi.fn();
            const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
                downloads.push(this.download);
            });

            q<HTMLButtonElement>('.export').click();
            await nextTick();

            expect(downloads).toEqual(['nextup-2026-10-06.json']);
            const saved = JSON.parse(await created[0]!.text());
            expect(saved).toMatchObject({ format: 'nextup', schemaVersion: 1 });
            expect(saved.tasks.map((t: Task) => t.id)).toEqual(['a', 'b']);
            expect(document.body.querySelector('a[download]')).toBeNull(); // временная ссылка убрана

            click.mockRestore();
            w.unmount();
        });
    });

    describe('импорт', () => {
        it('файл этого приложения: добавляет задачи и сообщает итог', async () => {
            const { w, store } = mountDrawer();
            const snapshot = JSON.stringify({ format: 'nextup', schemaVersion: 1, exportedAt: 1, tasks: [makeTask({ id: 'n1', date: '2026-10-20', note: 'новая' })] });

            await importFile(w, file(snapshot));
            expect(store.tasks.map((t) => t.id)).toEqual(['n1']);
            expect(mocks.toasts).toEqual(['success: Импорт завершён. Добавлено: 1, обновлено: 0, пропущено: 0.']);
            expect(JSON.parse(localStorage.getItem(KEYS.tasks) ?? '{}').tasks).toHaveLength(1);
            w.unmount();
        });

        it('старый формат с мусором и устаревшими записями: сообщает о каждой группе', async () => {
            const { w, store } = mountDrawer();
            const legacy = [
                { id: 'l1', date: '20.10.2026', note: 'ok', checkList: [], irrelevant: false, rollOver: 0, markProc: 0 },
                { id: 'l2', date: '01.01.2020', note: 'старое', checkList: [], irrelevant: false, rollOver: 0, markProc: 1 },
                { id: 'bad', date: '31.02.2026', note: 'x', checkList: [] },
            ];

            await importFile(w, file(JSON.stringify(legacy)));
            expect(store.tasks.map((t) => t.id)).toEqual(['l1']);
            expect(mocks.toasts[0]).toBe('success: Импорт завершён. Добавлено: 1, обновлено: 0, пропущено: 0. Повреждённых записей: 1. Старше года, не импортировано: 1.');
            w.unmount();
        });

        it('если ничего нового не добавлено, сообщение — предупреждение', async () => {
            const same = makeTask({ id: 'a', date: '2026-10-20' });
            const { w } = mountDrawer([same]);
            await importFile(w, file(JSON.stringify({ format: 'nextup', schemaVersion: 1, exportedAt: 1, tasks: [same] })));
            expect(mocks.toasts[0]).toBe('warning: Импорт завершён. Добавлено: 0, обновлено: 0, пропущено: 1.');
            w.unmount();
        });

        it.each([
            ['не JSON', 'это не json', 'Файл не похож на JSON.'],
            ['неизвестный формат', '{"привет":1}', 'Не удалось распознать файл: нужен JSON, сохранённый этим приложением или его прежней версией.'],
        ])('%s: понятная ошибка, список не меняется', async (_name, content, message) => {
            const { w, store } = mountDrawer([makeTask({ id: 'keep', date: '2026-10-20' })]);
            await importFile(w, file(content));

            expect(mocks.toasts).toEqual([`error: ${message}`]);
            expect(store.tasks.map((t) => t.id)).toEqual(['keep']);
            w.unmount();
        });

        it('слишком большой файл отвергается, не читаясь', async () => {
            const { w, store } = mountDrawer();
            const big = file('[]');
            Object.defineProperty(big, 'size', { value: MAX_IMPORT_BYTES + 1 });
            const read = vi.spyOn(big, 'text');

            await importFile(w, big);
            expect(mocks.toasts).toEqual(['error: Файл слишком большой (больше 5 МБ).']);
            expect(read).not.toHaveBeenCalled();
            expect(store.empty).toBe(true);
            w.unmount();
        });

        it('ошибка чтения файла', async () => {
            const { w } = mountDrawer();
            const broken = file('[]');
            vi.spyOn(broken, 'text').mockRejectedValue(new Error('io'));
            await importFile(w, broken);
            expect(mocks.toasts).toEqual(['error: Не удалось прочитать файл.']);
            w.unmount();
        });

        it('пустой выбор файлов ничего не делает', async () => {
            const { w } = mountDrawer();
            w.findComponent(TaoFileDrop).vm.$emit('files', []);
            await nextTick();
            expect(mocks.toasts).toEqual([]);
            w.unmount();
        });
    });

    describe('«Удалить всё»', () => {
        const tasks = [makeTask({ id: 'a', date: '2026-10-20' }), makeTask({ id: 'b', date: '2026-10-21' })];

        it('спрашивает подтверждение; «нет» ничего не удаляет', async () => {
            const { w, store } = mountDrawer(tasks);
            mocks.answer = false;
            q<HTMLButtonElement>('.remove-all').click();
            await vi.waitFor(() => expect(mocks.asked).toHaveLength(2));

            expect(mocks.asked).toEqual(['Подтвердите действие', 'Вы действительно хотите удалить все записи?']);
            expect(store.tasks).toHaveLength(2);
            w.unmount();
        });

        it('«да» удаляет всё и сохраняет пустой список', async () => {
            const { w, store } = mountDrawer(tasks);
            q<HTMLButtonElement>('.remove-all').click();
            await vi.waitFor(() => expect(store.tasks).toHaveLength(0));

            expect(JSON.parse(localStorage.getItem(KEYS.tasks) ?? '{}').tasks).toEqual([]);
            w.unmount();
        });
    });

    describe('адрес синхронизации (заложен, но скрыт)', () => {
        afterEach(() => {
            FEATURES.sync = false;
        });

        it('по умолчанию поля нет', () => {
            const { w } = mountDrawer();
            expect(document.body.querySelector('input[placeholder="https://example.com/sync"]')).toBeNull();
            w.unmount();
        });

        it('при включении: небезопасный адрес отвергается с подсказкой, https сохраняется', async () => {
            FEATURES.sync = true;
            const { w } = mountDrawer();
            const input = q<HTMLInputElement>('input[placeholder="https://example.com/sync"]');
            const type = async (value: string) => {
                input.value = value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                await nextTick();
                input.dispatchEvent(new Event('blur'));
                await nextTick();
            };

            await type('http://example.com/sync');
            expect(document.body.textContent).toContain('Допустим адрес https:// (или http://localhost)');
            expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').sync?.endpoint ?? '').toBe('');

            await type('https://example.com/sync');
            expect(document.body.textContent).not.toContain('Допустим адрес https://');
            expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').sync.endpoint).toBe('https://example.com/sync');
            w.unmount();
        });
    });
});

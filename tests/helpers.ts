import { createJsonStorage, type JsonStorage } from '@/storage/local';
import type { Task } from '@/domain/types';

let counter = 0;

export function makeTask(overrides: Partial<Task> = {}): Task {
    const date = overrides.date ?? '2026-10-06';
    return {
        id: `t${++counter}`,
        date,
        note: 'note',
        checklist: [],
        recurrence: 'none',
        anchor: overrides.anchor ?? date,
        done: false,
        rolled: false,
        updatedAt: 1,
        ...overrides,
    };
}

export function idGenerator(prefix = 'n'): () => string {
    let n = 0;
    return () => `${prefix}${++n}`;
}

export function memoryJsonStorage(initial: Record<string, string> = {}): { storage: JsonStorage; map: Map<string, string> } {
    const map = new Map(Object.entries(initial));
    const storage = createJsonStorage({
        getItem: (k) => map.get(k) ?? null,
        setItem: (k, v) => void map.set(k, v),
        removeItem: (k) => void map.delete(k),
    });
    return { storage, map };
}

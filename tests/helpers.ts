import type { Item, Note, Repeat } from '@/core/model';

export function note(over: Partial<Note> & { id: string; due: string }): Note {
    return { body: 'заметка', items: [], repeat: null, doneAt: null, createdAt: 1, updatedAt: 1, deletedAt: null, ...over };
}

export const item = (id: string, text: string, doneAt: number | null = null): Item => ({ id, text, doneAt });

export const repeat = (over: Partial<Repeat> & { anchor: string }): Repeat => ({ series: 's', every: 1, unit: 'day', ...over });

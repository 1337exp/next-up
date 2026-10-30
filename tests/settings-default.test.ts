import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@/app/settings';

describe('настройки по умолчанию', () => {
    it('тема — тёмная, а не «как в системе»', () => {
        expect(defaultSettings().mode).toBe('dark');
    });
});

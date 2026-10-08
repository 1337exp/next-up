import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useDayNotifier } from '@/composables/dayNotifier';
import { todayIso } from '@/domain/date';
import { applyLocale } from '@/i18n';
import { KEYS } from '@/storage/local';
import { makeTask } from './helpers';

const showNotification = vi.fn(async () => undefined);

function stubBrowser(permission: string): void {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    Object.defineProperty(window, 'Notification', { value: Object.assign(function () {}, { permission }), configurable: true });
    Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: vi.fn(async () => ({})), ready: Promise.resolve({ showNotification }) },
        configurable: true,
    });
}

function setVisibility(state: 'hidden' | 'visible'): void {
    Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

function mountNotifier(settings: Record<string, unknown>) {
    localStorage.setItem(KEYS.settings, JSON.stringify({ schemaVersion: 1, locale: 'ru', ...settings }));
    localStorage.setItem(
        KEYS.tasks,
        JSON.stringify({ schemaVersion: 1, tasks: [makeTask({ id: 'a', date: todayIso(), note: 'Позвонить в банк' }), makeTask({ id: 'b', date: todayIso(), note: 'Купить хлеб' })] }),
    );
    const pinia = createPinia();
    setActivePinia(pinia);
    const Probe = defineComponent({ setup: () => void useDayNotifier(), template: '<div />' });
    return mount(Probe, { global: { plugins: [pinia] } });
}

const flush = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
};

describe('оповещение о задачах на сегодня', () => {
    beforeEach(() => {
        localStorage.clear();
        showNotification.mockClear();
        applyLocale('ru');
        stubBrowser('granted');
        setVisibility('hidden');
    });
    afterEach(() => setVisibility('visible'));

    it('включено, вкладка в фоне: одно оповещение со списком задач; день запоминается', async () => {
        const w = mountNotifier({ notifyToday: true });
        await flush();
        expect(showNotification).toHaveBeenCalledTimes(1);
        const [title, options] = showNotification.mock.calls[0] as unknown as [string, { body: string }];
        expect(title).toBe('На сегодня есть задачи (2):');
        expect(options.body).toBe('Позвонить в банк\nКупить хлеб');
        expect(JSON.parse(localStorage.getItem(KEYS.settings) ?? '{}').lastNotified).toBe(todayIso());
        w.unmount();
    });

    it('в тот же день повторно не показывается (например, после перезагрузки страницы)', async () => {
        const w = mountNotifier({ notifyToday: true, lastNotified: todayIso() });
        await flush();
        expect(showNotification).not.toHaveBeenCalled();
        w.unmount();
    });

    it('выключено, вкладка открыта или нет разрешения: тишина', async () => {
        mountNotifier({ notifyToday: false }).unmount();
        setVisibility('visible');
        mountNotifier({ notifyToday: true }).unmount();
        setVisibility('hidden');
        stubBrowser('default');
        mountNotifier({ notifyToday: true }).unmount();
        await flush();
        expect(showNotification).not.toHaveBeenCalled();
    });
});

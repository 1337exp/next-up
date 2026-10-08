import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOTICE_TAG, notifySupport, requestNotifications, showNotice } from '@/lib/notifications';

// happy-dom не знает ни Notification, ни service worker: подменяем то, что нужно обёртке
const showNotification = vi.fn(async () => undefined);
const register = vi.fn(async () => ({}));

function stubBrowser({ permission = 'default', secure = true, worker = true, requested = 'granted' }: { permission?: string; secure?: boolean; worker?: boolean; requested?: string } = {}) {
    const NotificationStub = Object.assign(function () {}, {
        permission,
        requestPermission: vi.fn(async () => {
            NotificationStub.permission = requested;
            return requested;
        }),
    });
    vi.stubGlobal('Notification', NotificationStub);
    vi.stubGlobal('isSecureContext', secure);
    Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
    Object.defineProperty(window, 'Notification', { value: NotificationStub, configurable: true });
    if (worker) {
        Object.defineProperty(navigator, 'serviceWorker', { value: { register, ready: Promise.resolve({ showNotification }) }, configurable: true });
    } else {
        Reflect.deleteProperty(navigator, 'serviceWorker');
    }
    return NotificationStub;
}

describe('оповещения браузера', () => {
    beforeEach(() => {
        showNotification.mockClear();
        register.mockClear();
    });
    afterEach(() => vi.unstubAllGlobals());

    it('состояние: поддержка, разрешение', () => {
        stubBrowser({ permission: 'granted' });
        expect(notifySupport()).toBe('granted');
        stubBrowser({ permission: 'denied' });
        expect(notifySupport()).toBe('denied');
        stubBrowser({ permission: 'default' });
        expect(notifySupport()).toBe('default');
    });

    it('без защищённого контекста или service worker оповещений нет', () => {
        stubBrowser({ secure: false });
        expect(notifySupport()).toBe('unsupported');
        stubBrowser({ worker: false });
        expect(notifySupport()).toBe('unsupported');
    });

    it('разрешение просим один раз и регистрируем service worker только после согласия', async () => {
        const stub = stubBrowser({ requested: 'granted' });
        expect(await requestNotifications()).toBe('granted');
        expect(stub.requestPermission).toHaveBeenCalledTimes(1);
        expect(register).toHaveBeenCalledTimes(1);
    });

    it('отказ пользователя: service worker не регистрируется', async () => {
        stubBrowser({ requested: 'denied' });
        expect(await requestNotifications()).toBe('denied');
        expect(register).not.toHaveBeenCalled();
    });

    it('в неподдерживаемом браузере ничего не спрашиваем', async () => {
        const stub = stubBrowser({ secure: false });
        expect(await requestNotifications()).toBe('unsupported');
        expect(stub.requestPermission).not.toHaveBeenCalled();
    });

    it('показывает оповещение через service worker с общим тегом', async () => {
        stubBrowser({ permission: 'granted' });
        expect(await showNotice('На сегодня: 2', 'строка 1\nстрока 2')).toBe(true);
        expect(showNotification).toHaveBeenCalledWith('На сегодня: 2', { body: 'строка 1\nстрока 2', tag: NOTICE_TAG, requireInteraction: true });
    });

    it('без разрешения не показывает', async () => {
        stubBrowser({ permission: 'default' });
        expect(await showNotice('x', 'y')).toBe(false);
        expect(showNotification).not.toHaveBeenCalled();
    });
});

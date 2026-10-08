/**
 * Оповещения браузера. Показываем через service worker (`registration.showNotification`): на телефонах
 * конструктор `new Notification()` не работает. Нужен защищённый контекст (https или localhost).
 *
 * Состояния: `unsupported` — браузер или адрес не умеют, `denied` — запретил пользователь,
 * `default` — ещё не спрашивали, `granted` — разрешено.
 */
export type NotifySupport = 'unsupported' | 'denied' | 'default' | 'granted';

/** Тег один на все оповещения: новое заменяет старое, а не копится стопкой. */
export const NOTICE_TAG = 'nextup-today';

const SW_URL = 'sw.js';

export function notifySupport(): NotifySupport {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (!window.isSecureContext || !('serviceWorker' in navigator)) return 'unsupported';
    return Notification.permission;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
    try {
        // относительный адрес: приложение может лежать в любой подпапке (см. base в vite.config.ts)
        await navigator.serviceWorker.register(new URL(SW_URL, document.baseURI).href);
        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
}

/** Просит разрешение (вызывать из действия пользователя) и готовит service worker. */
export async function requestNotifications(): Promise<NotifySupport> {
    if (notifySupport() === 'unsupported') return 'unsupported';
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && !(await registration())) return 'unsupported';
    return permission;
}

/** Показывает оповещение; `false`, если не удалось (нет разрешения или service worker). */
export async function showNotice(title: string, body: string): Promise<boolean> {
    if (notifySupport() !== 'granted') return false;
    const reg = await registration();
    if (!reg) return false;
    try {
        await reg.showNotification(title, { body, tag: NOTICE_TAG, requireInteraction: true });
        return true;
    } catch {
        return false;
    }
}

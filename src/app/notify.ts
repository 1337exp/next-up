import { watch } from 'vue';
import { decideTodayNotice, todayDigest } from '@/core/digest';
import { useNotesStore } from '@/app/notes';
import { useSettingsStore } from '@/app/settings';
import { useI18n } from '@/i18n';

/**
 * Оповещения браузера. Показываем через service worker (`registration.showNotification`): на телефонах конструктор
 * `new Notification()` не работает. Нужен защищённый контекст (https или localhost).
 *
 * `unsupported` — браузер или адрес не умеют, `denied` — запретил пользователь, `default` — ещё не спрашивали,
 * `granted` — разрешено.
 */
export type NotifySupport = 'unsupported' | 'denied' | 'default' | 'granted';

/** Тег один на все оповещения: новое заменяет старое, а не копится стопкой. */
export const NOTICE_TAG = 'nextup-today';

export function notifySupport(): NotifySupport {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    if (!window.isSecureContext || !('serviceWorker' in navigator)) return 'unsupported';
    return Notification.permission;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
    try {
        // относительный адрес: приложение может лежать в любой подпапке (см. base в vite.config.ts)
        await navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href);
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

/** Оповещение «На сегодня есть заметки» с текущим составом; для проверки из настроек в режиме разработки. */
export async function showTodayNotice(): Promise<boolean> {
    const notes = useNotesStore();
    const { t } = useI18n();
    const digest = todayDigest(notes.notes, notes.today);
    return showNotice(t('notify.today', [digest.count]), digest.lines.join('\n'));
}

/**
 * Раз в день, когда сменилась дата, показывает оповещение (если включено в настройках, есть разрешение и вкладка
 * скрыта). Вызывать один раз, из корня приложения.
 */
export function useDayNotifier(): void {
    const { settings } = useSettingsStore();
    const notes = useNotesStore();
    const { t } = useI18n();

    function run(today: string): void {
        const decision = decideTodayNotice({
            enabled: settings.notifyToday,
            granted: notifySupport() === 'granted',
            lastNotified: settings.lastNotified,
            today,
            hidden: document.visibilityState === 'hidden',
        });
        if (decision.mark) settings.lastNotified = today;
        if (!decision.show) return;

        const digest = todayDigest(notes.notes, notes.today);
        if (digest.count > 0) void showNotice(t('notify.today', [digest.count]), digest.lines.join('\n'));
    }

    watch(() => notes.today, run, { immediate: true });
}

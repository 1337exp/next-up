import { computed, watch } from 'vue';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { addDays, isoParts } from '@/core/date';
import { upcomingDigests } from '@/core/digest';
import { isNative } from '@/app/native';
import { useNotesStore } from '@/app/notes';
import { notifySupport } from '@/app/notify';
import { useSettingsStore } from '@/app/settings';
import { useI18n } from '@/i18n';

/** Час, в который приходит оповещение «на сегодня есть заметки». */
export const NOTICE_HOUR = 9;
/** На сколько дней вперёд оповещения ставятся заранее (приложение может долго не открываться). */
const WINDOW_DAYS = 30;
const CHANNEL = 'today';

/** Номер дня как id оповещения: один день — одно оповещение, пересчёт заменяет прежнее. */
const idOf = (iso: string): number => {
    const { year, month, day } = isoParts(iso);
    return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
};

/**
 * В оболочке Android приложение может быть закрыто, и некому проверить, что сменилась дата, поэтому оповещения ставятся
 * заранее: по одному на ближайшие дни с заметками, на {@link NOTICE_HOUR}:00. План пересчитывается при каждом изменении
 * заметок, языка и настройки; пока план не изменился, система не трогается. Вызывать один раз, из корня приложения.
 */
export function useNativeSchedule(): void {
    if (!isNative()) return;
    const { settings } = useSettingsStore();
    const notes = useNotesStore();
    const { t } = useI18n();

    const plan = computed<LocalNotificationSchema[]>(() => {
        if (!settings.notifyToday || notifySupport() !== 'granted') return [];
        const now = Date.now();
        // сегодняшний час уже прошёл: окно начинается с завтра
        const from = new Date(now).getHours() >= NOTICE_HOUR ? addDays(notes.today, 1) : notes.today;
        return upcomingDigests(notes.notes, from, WINDOW_DAYS).map((digest) => {
            const { year, month, day } = isoParts(digest.date);
            const body = digest.lines.join('\n');
            return {
                id: idOf(digest.date),
                title: t('notify.today', [digest.count]),
                body,
                largeBody: body,
                channelId: CHANNEL,
                schedule: { at: new Date(year, month - 1, day, NOTICE_HOUR, 0, 0), allowWhileIdle: true },
            };
        });
    });

    let busy: Promise<void> = Promise.resolve();
    function apply(next: LocalNotificationSchema[]): void {
        // изменения идут по очереди: «снять старые, поставить новые» не должно перемешиваться с предыдущим пересчётом
        busy = busy.then(async () => {
            try {
                const { notifications } = await LocalNotifications.getPending();
                if (notifications.length > 0) await LocalNotifications.cancel({ notifications: notifications.map(({ id }) => ({ id })) });
                if (next.length > 0) await LocalNotifications.schedule({ notifications: next });
            } catch {
                // нет доступа к системе оповещений: повторится при следующем изменении
            }
        });
    }

    watch(() => JSON.stringify(plan.value), () => apply(plan.value), { immediate: true });
}

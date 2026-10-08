import { watch } from 'vue';
import { decideTodayNotice, todayDigest } from '@/domain/digest';
import { useI18n } from '@/i18n';
import { notifySupport, showNotice } from '@/lib/notifications';
import { useSettingsStore } from '@/stores/settings';
import { useTasksStore } from '@/stores/tasks';

/**
 * Раз в день, когда сменилась дата, показывает оповещение «На сегодня есть задачи» (если включено в настройках,
 * есть разрешение и вкладка скрыта). Вызывать один раз, из корня приложения.
 */
export function useDayNotifier(): void {
    const settings = useSettingsStore();
    const tasks = useTasksStore();
    const { t } = useI18n();

    function run(today: string): void {
        const decision = decideTodayNotice({
            enabled: settings.notifyToday,
            granted: notifySupport() === 'granted',
            lastNotified: settings.lastNotified,
            today,
            hidden: document.visibilityState === 'hidden',
        });
        if (decision.mark) settings.setLastNotified(today);
        if (!decision.show) return;

        const digest = todayDigest(tasks.tasks, tasks.today);
        if (digest.count > 0) void showNotice(t('tasks.notify.today', [digest.count]), digest.lines.join('\n'));
    }

    watch(() => tasks.today, run, { immediate: true });
}

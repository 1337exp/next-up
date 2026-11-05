import type { CapacitorConfig } from '@capacitor/cli';

// Оболочка Android: берёт готовую сборку из dist/. Сборка APK: `npm run apk` (scripts/apk.mjs).
const config: CapacitorConfig = {
    // идентификатор приложения в Android; менять нужно до первой установки (иначе это будет другое приложение)
    appId: 'app.nextup.notes',
    appName: 'Next Up',
    webDir: 'dist',
    // цвет за страницей, пока она грузится: тот же, что у тёмной темы
    backgroundColor: '#141414',
    android: {
        // в APK нет сети и сайта: страницы и данные локальные, смешанный контент не нужен
        allowMixedContent: false,
    },
    plugins: {
        LocalNotifications: {
            // значок в строке состояния: контур на прозрачном фоне (android/app/src/main/res/drawable/ic_stat_nextup.png)
            smallIcon: 'ic_stat_nextup',
            iconColor: '#FFC74A',
        },
    },
};

export default config;

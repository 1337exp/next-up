import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/** Приложение запущено внутри оболочки Android (Capacitor), а не в браузере. */
export const isNative = (): boolean => Capacitor.isNativePlatform();

/**
 * Системная кнопка (и жест) «назад» в оболочке Android: если в истории приложения есть куда вернуться, возвращает по ней
 * (закрывает заметку, настройки, раздел), иначе закрывает приложение. Сам Capacitor по истории страницы не ходит.
 */
export function bindBackButton(canGoBack: () => boolean): void {
    if (!isNative()) return;
    void App.addListener('backButton', () => {
        if (canGoBack()) history.back();
        else void App.exitApp();
    });
}

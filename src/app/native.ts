import { Capacitor } from '@capacitor/core';

/** Приложение запущено внутри оболочки Android (Capacitor), а не в браузере. */
export const isNative = (): boolean => Capacitor.isNativePlatform();

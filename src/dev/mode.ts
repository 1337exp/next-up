import { KEY_PREFIX } from '@/storage/local';

/**
 * Ключ в localStorage, которым разработчик включает (`1`) или выключает (`0`) режим разработки принудительно:
 * `localStorage.setItem('nextup-dev', '1')`. Сильнее любых автоматических признаков, в том числе адреса.
 */
export const DEV_FLAG_KEY = `${KEY_PREFIX}dev`;

export interface DevModeInput {
    /** `location.hostname`: для IPv6 с квадратными скобками, как отдаёт браузер. */
    hostname: string;
    /** Значение флага из localStorage; `null`, если его нет. */
    flag: string | null;
    /** Сборка для разработки (`import.meta.env.DEV`). */
    isDevBuild: boolean;
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

/** Заход по IP-адресу или на localhost — это домашний стенд разработчика, а не публичный сайт. */
export function isDevHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return IPV4.test(host) || host.startsWith('[') || host === 'localhost' || host.endsWith('.localhost');
}

export function resolveDevMode({ hostname, flag, isDevBuild }: DevModeInput): boolean {
    if (flag === '0') return false;
    if (flag === '1') return true;
    return isDevBuild || isDevHost(hostname);
}

/** Режим разработки для текущей страницы. Не бросает: localStorage бывает недоступен. */
export function detectDevMode(): boolean {
    let flag: string | null = null;
    try {
        flag = window.localStorage.getItem(DEV_FLAG_KEY);
    } catch {
        // доступ к хранилищу запрещён: обходимся автоматическими признаками
    }
    return resolveDevMode({ hostname: window.location.hostname, flag, isDevBuild: import.meta.env.DEV });
}

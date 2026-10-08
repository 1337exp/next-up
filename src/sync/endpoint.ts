const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Адрес синхронизации задаёт пользователь, поэтому разрешены только `https://`
 * (и `http://` для локальной разработки). Пустая строка — синхронизация выключена.
 */
export function isAllowedEndpoint(value: string): boolean {
    if (value === '') return true;

    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    if (url.username || url.password) return false; // учётные данные в адресе не принимаем
    return url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname));
}

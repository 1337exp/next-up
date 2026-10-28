/**
 * Режим разработки: dev-сборка, заход на localhost или по IP-адресу, либо флаг в localStorage
 * (`nextup-dev` = `1` включает где угодно, `0` выключает и при заходе по IP).
 */
export function isDevMode(): boolean {
    try {
        const flag = localStorage.getItem('nextup-dev');
        if (flag === '1') return true;
        if (flag === '0') return false;
    } catch {
        // хранилище недоступно: решают остальные признаки
    }
    if (import.meta.env.DEV) return true;
    const host = location.hostname;
    return host === 'localhost' || host === '[::1]' || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

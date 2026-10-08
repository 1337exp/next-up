import type { Settings } from '@/domain/settings';
import { isAllowedEndpoint } from './endpoint';
import type { SyncAdapter } from './types';
import { createWebhookAdapter } from './webhook';

export type { SyncAdapter } from './types';
export { isAllowedEndpoint } from './endpoint';

/** Адаптер для адреса из настроек: вебхук. Пустой или недопустимый адрес: синхронизации нет, `null`. */
export function getSyncAdapter(settings: Pick<Settings, 'sync'>): SyncAdapter | null {
    const { endpoint } = settings.sync;
    return endpoint !== '' && isAllowedEndpoint(endpoint) ? createWebhookAdapter(endpoint) : null;
}

/** Хук «приложение запустилось»: здесь будет первый `pull`. В v1 ничего не делает. */
export function onSyncStart(): void {}

/** Хук «локальные данные сохранены»: здесь будет `push` с задержкой. В v1 ничего не делает. */
export function onLocalChange(): void {}

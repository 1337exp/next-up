import type { Settings } from '@/domain/settings';
import type { SyncAdapter } from './types';

export type { SyncAdapter } from './types';
export { isAllowedEndpoint } from './endpoint';

/**
 * Адаптер для адреса из настроек. В v1 синхронизации нет, поэтому всегда `null`;
 * реальный адаптер подключается здесь, остальной код не меняется.
 */
export function getSyncAdapter(_settings: Pick<Settings, 'sync'>): SyncAdapter | null {
    return null;
}

/** Хук «приложение запустилось»: здесь будет первый `pull`. В v1 ничего не делает. */
export function onSyncStart(): void {}

/** Хук «локальные данные сохранены»: здесь будет `push` с задержкой. В v1 ничего не делает. */
export function onLocalChange(): void {}

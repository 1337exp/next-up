// Service worker Next Up: офлайн-оболочка и оповещения. Данные и так лежат в браузере, поэтому после первой загрузки
// приложение целиком работает без сети.
//
// Список файлов для кеша подставляет сборка (build/precache.ts) вместо метки PRECACHE; в режиме разработки он пуст,
// и worker ничего не кеширует: он нужен там только для оповещений.

const VERSION = '__VERSION__';
const PREFIX = 'nextup-';
const CACHE = PREFIX + VERSION;
/* eslint-disable-next-line */
const PRECACHE = /*PRECACHE*/ [];

// ignoreVary: у ответов сервера бывает Vary: Origin, а запрос модульного скрипта несёт Origin, которого не было у запроса,
// которым файл клали в кеш; без этого cache.match промахивается и офлайн страница остаётся пустой.
const MATCH = { ignoreSearch: true, ignoreVary: true };

const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            if (PRECACHE.length > 0) {
                const cache = await caches.open(CACHE);
                // cache: 'reload' — не брать устаревшее из HTTP-кеша браузера
                await cache.addAll(PRECACHE.map((path) => new Request(scoped(path), { cache: 'reload' })));
            }
            await self.skipWaiting();
        })(),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (PRECACHE.length === 0 || request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE);

            // страница: сначала сеть (свежая версия, когда она есть), без сети — сохранённая оболочка
            if (request.mode === 'navigate') {
                try {
                    return await fetch(request);
                } catch {
                    return (await cache.match(scoped('index.html'), MATCH)) ?? Response.error();
                }
            }

            // файлы сборки с хешем в имени: из кеша, они не меняются
            const cached = await cache.match(request, MATCH);
            return cached ?? fetch(request);
        })(),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        (async () => {
            const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (windows.length > 0) return windows[0].focus();
            return self.clients.openWindow(self.registration.scope);
        })(),
    );
});

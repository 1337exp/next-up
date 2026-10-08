// Минимальный service worker: нужен только затем, чтобы показывать оповещения (на телефонах без него никак)
// и открывать приложение по клику на них. Ничего не кэширует и запросы не перехватывает.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

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

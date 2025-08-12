// Service Worker for Push Notifications

self.addEventListener('push', (event) => {
    const data = event.data.json();

    const title = data.title || 'Nueva Notificación';
    const options = {
        body: data.body || 'Ha recibido una nueva actualización.',
        icon: data.icon || '/icon-192x192.png', // Default icon
        badge: '/badge-72x72.png', // A smaller icon for the notification bar
        data: {
            url: data.url || '/', // URL to open on click
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    // Open the URL associated with the notification
    const urlToOpen = event.notification.data.url || '/';
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );
});

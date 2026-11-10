// Service Worker for Web Push Notifications in Charity Automation System
self.addEventListener('push', (event) => {
  let data = {
    title: 'مؤسسه خیریه حضرت ام‌البنین (س)',
    body: 'رویداد جدیدی در سامانه خیریه ثبت شد.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/',
    tag: 'charity-alert',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || 'charity-notification',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'مشاهده پرونده' },
      { action: 'close', title: 'بستن' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

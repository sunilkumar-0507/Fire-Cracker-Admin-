/**
 * The admin's service worker. It does one thing: show the API's push for a new
 * order or bulk enquiry, and open the right screen when it is tapped.
 *
 * No caching, on purpose. The admin is always used online, against live data,
 * and a cached shell that outlives a deploy is a worse bug than a slow load.
 *
 * The payload is what the API's WebPushClient sends:
 *   { title, body, url: "/orders" | "/enquiries", tag, data: { orderId | enquiryId } }
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data ? event.data.text() : '' };
  }

  const title = message.title || 'SKV Pyros admin';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: message.body || '',
      // One notification per order: a repeat replaces it rather than stacking…
      tag: message.tag || undefined,
      // …but still rings, because a repeat means something new happened.
      renotify: Boolean(message.tag),
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
      data: { url: message.url || '/', ...(message.data || {}) },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url || '/', self.registration.scope).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Reuse an admin tab that is already open rather than opening another.
      const open = windows.find((client) => client.url.startsWith(self.registration.scope));
      if (open) {
        await open.focus();
        if ('navigate' in open) await open.navigate(target).catch(() => {});
        return;
      }

      await self.clients.openWindow(target);
    })(),
  );
});


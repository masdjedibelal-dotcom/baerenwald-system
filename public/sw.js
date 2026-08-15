/* Bärenwald — Service Worker (PWA Push) */
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {
    title: '',
    body: 'Neue Benachrichtigung',
    url: '/login',
  }
  try {
    if (event.data) {
      const parsed = event.data.json()
      data = { ...data, ...parsed }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data.body = text
    } catch {
      /* ignore */
    }
  }

  const targetUrl = String(data.url || '/login')
  const loginUrl =
    targetUrl.startsWith('/login') || targetUrl.includes('login')
      ? targetUrl
      : `/login?next=${encodeURIComponent(targetUrl)}`

  // Gleicher Text wie Manifest-Name → Safari: „Bärenwald from Bärenwald“. Leer = nur App-Name.
  let title = String(data.title || '').trim()
  if (!title || /^bärenwald$/i.test(title)) title = ''

  event.waitUntil(
    self.registration.showNotification(title, {
      body: String(data.body || ''),
      icon: '/icons/pwa-192.png',
      badge: '/icons/pwa-192.png',
      data: { url: loginUrl, deep: targetUrl },
      tag: String(data.tag || 'crm-push'),
      renotify: Boolean(data.renotify),
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const deep = String(event.notification.data?.deep || '/')
  const url = String(event.notification.data?.url || `/login?next=${encodeURIComponent(deep)}`)

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            try {
              await client.navigate(url)
              return
            } catch {
              /* fall through */
            }
          }
        }
      }
      await self.clients.openWindow(url)
    })()
  )
})

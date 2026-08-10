'use client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function ensureCrmServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker nicht verfügbar')
  }
  return navigator.serviceWorker.register('/sw.js', { scope: '/' })
}

export async function subscribeCrmPush(vapidPublicKey: string): Promise<PushSubscription> {
  const reg = await ensureCrmServiceWorker()
  await navigator.serviceWorker.ready

  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
  })
}

export async function unsubscribeCrmPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}

export function serializePushSubscription(sub: PushSubscription): {
  endpoint: string
  p256dh: string
  auth: string
} {
  const json = sub.toJSON()
  const keys = json.keys ?? {}
  return {
    endpoint: json.endpoint ?? sub.endpoint,
    p256dh: String(keys.p256dh ?? ''),
    auth: String(keys.auth ?? ''),
  }
}

/** Lokaler Test-Banner (ohne Server-Push). */
export async function showLocalTestNotification(): Promise<void> {
  if (!('Notification' in window)) throw new Error('Notifications nicht verfügbar')
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission()
    if (p !== 'granted') throw new Error('Berechtigung verweigert')
  }
  const reg = await ensureCrmServiceWorker()
  await reg.showNotification('Bärenwald CRM', {
    body: 'Test erfolgreich — Push ist auf diesem Gerät aktiv.',
    icon: '/icons/pwa-192.png',
    tag: 'crm-push-test',
    data: { url: '/login?next=/einstellungen/benachrichtigungen', deep: '/einstellungen/benachrichtigungen' },
  })
}

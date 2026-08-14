/** true nur in installierter PWA (Home-Bildschirm / standalone). */
export function isCrmPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || ios
}

export function pushSupportedInBrowser(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export type PushCapabilityStatus =
  | 'unsupported'
  | 'not_installed'
  | 'permission_denied'
  | 'permission_default'
  | 'ready'

export function resolvePushCapabilityStatus(): PushCapabilityStatus {
  if (!pushSupportedInBrowser()) return 'unsupported'
  if (!isCrmPwaStandalone()) return 'not_installed'
  const perm = Notification.permission
  if (perm === 'denied') return 'permission_denied'
  if (perm === 'default') return 'permission_default'
  return 'ready'
}

export const DATENSCHUTZ_HINT_STORAGE_KEY = 'baerenwald_datenschutz_hint_v1'
export const DATENSCHUTZ_HINT_COOKIE = 'bw_datenschutz_hint'

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 400

export function readDatenschutzHintLocal(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.localStorage.getItem(DATENSCHUTZ_HINT_STORAGE_KEY))
  } catch {
    return false
  }
}

export function writeDatenschutzHintLocal(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DATENSCHUTZ_HINT_STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function readDatenschutzHintCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((part) => {
    const [name, value] = part.trim().split('=')
    return name === DATENSCHUTZ_HINT_COOKIE && value === '1'
  })
}

export function writeDatenschutzHintCookie(): void {
  if (typeof document === 'undefined') return
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${DATENSCHUTZ_HINT_COOKIE}=1; path=/; max-age=${COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`
}

export function markDatenschutzHintClient(): void {
  writeDatenschutzHintLocal()
  writeDatenschutzHintCookie()
}

export function datenschutzHintDismissedOnClient(): boolean {
  return readDatenschutzHintLocal() || readDatenschutzHintCookie()
}

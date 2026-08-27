/**
 * Einfaches In-Memory-Rate-Limit (Prozess-lokal).
 * Für CRM-Login: Drosselung nach fehlgeschlagenen Versuchen (App-seitig).
 * Supabase Auth hat zusätzlich eigene Rate-Limits (Dashboard → Auth → Rate Limits);
 * die App-Drosselung greift früher und mit klarer Nutzer-Meldung.
 * Siehe docs/auth/LOGIN-RATE-LIMIT.md
 */

const requests = new Map<string, { count: number; reset: number }>()

function mapKey(namespace: string, key: string) {
  return `rl_${namespace}_${key}`
}

/** Nur lesen — erhöht den Zähler nicht. */
export function peekRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
  namespace = 'default'
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const entry = requests.get(mapKey(namespace, key))
  if (!entry || now > entry.reset) {
    return { allowed: true, remaining: limit, retryAfterSec: 0 }
  }
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.reset - now) / 1000)),
    }
  }
  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterSec: 0,
  }
}

/** Fehlversuch zählen. */
export function recordRateLimitFailure(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
  namespace = 'default'
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const k = mapKey(namespace, key)
  const entry = requests.get(k)

  if (!entry || now > entry.reset) {
    requests.set(k, { count: 1, reset: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  entry.count++
  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((entry.reset - now) / 1000)),
    }
  }
  return {
    allowed: true,
    remaining: limit - entry.count,
    retryAfterSec: 0,
  }
}

/** Alias für generische Nutzung (inkrementiert). */
export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
  namespace = 'default'
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  return recordRateLimitFailure(key, limit, windowMs, namespace)
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    requests.forEach((entry, k) => {
      if (now > entry.reset) requests.delete(k)
    })
  }, 60 * 60 * 1000)
}

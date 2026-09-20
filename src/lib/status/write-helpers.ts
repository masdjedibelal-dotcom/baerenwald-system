/**
 * Shared write-helpers: Status-Patches bauen (ohne DB).
 * Contract-Tests und write-* nutzen dieselben Transition-Regeln.
 */

export type StatusWritePatch = {
  status: string
  updated_at: string
} & Record<string, unknown>

export function nowIso(now = new Date()): string {
  return now.toISOString()
}

export function buildStatusPatch(
  status: string,
  extra: Record<string, unknown> = {},
  now = new Date()
): StatusWritePatch {
  return {
    status,
    updated_at: nowIso(now),
    ...extra,
  }
}

/** Storno ist aus jedem Nicht-Storno-Zustand erlaubt. */
export function isStornoStatus(status: string): boolean {
  return status.trim().toLowerCase() === 'storniert'
}

export function assertKnownStatus(
  domain: string,
  status: string,
  allowed: readonly string[]
): void {
  const key = status.trim().toLowerCase()
  if (!allowed.includes(key)) {
    throw new Error(`${domain}: unbekannter Status „${status}“`)
  }
}

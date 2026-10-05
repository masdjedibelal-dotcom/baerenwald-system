/** Chat-Schlüssel für URL und Liste: h:<Partner-ID> · k:<Kunden-ID> · t:<Nummer> */
export type WaZielSchluessel = { handwerkerId?: string | null; kundeId?: string | null; telefon?: string | null }

export function gespraechSchluessel(ziel: WaZielSchluessel): string {
  return ziel.handwerkerId ? `h:${ziel.handwerkerId}` : ziel.kundeId ? `k:${ziel.kundeId}` : `t:${ziel.telefon ?? ''}`
}

export function zielAusSchluessel(s: string | null | undefined): WaZielSchluessel | null {
  const m = String(s ?? '').match(/^([hkt]):(.+)$/)
  if (!m) return null
  return m[1] === 'h' ? { handwerkerId: m[2] } : m[1] === 'k' ? { kundeId: m[2] } : { telefon: m[2] }
}

/** Link ins Postfach zu einem Kontakt. */
export function nachrichtenHref(ziel: WaZielSchluessel): string {
  return `/nachrichten?chat=${encodeURIComponent(gespraechSchluessel(ziel))}`
}

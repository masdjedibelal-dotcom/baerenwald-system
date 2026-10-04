

/** Angebot vom Kunden angenommen (Funnel-Stufe „Angebot“). */
export function isAngenommenesAngebotStatus(
  status: string | null | undefined,
  statusEinfach?: string | null
): boolean {
  const fine = String(status ?? '').toLowerCase()
  const einfach = String(statusEinfach ?? '').toLowerCase()
  return (
    fine === 'kunde_akzeptiert' ||
    fine === 'angenommen' ||
    einfach === 'angenommen'
  )
}

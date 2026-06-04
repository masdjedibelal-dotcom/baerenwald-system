import 'server-only'

export async function getAbfahrtszeit(zielAdresse: string, terminZeit: string): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim()
  if (!key || !zielAdresse.trim()) return ''

  try {
    const origin = encodeURIComponent('Bärenwaldstraße 20, 81737 München')
    const destination = encodeURIComponent(`${zielAdresse.trim()}, München`)

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&departure_time=now&traffic_model=best_guess&key=${key}`
    )
    const data = (await res.json()) as {
      rows?: { elements?: { status?: string; duration?: { value: number }; duration_in_traffic?: { value: number } }[] }[]
    }
    const element = data.rows?.[0]?.elements?.[0]
    if (!element || element.status !== 'OK') return ''

    const dauerMin = Math.ceil((element.duration_in_traffic?.value ?? element.duration?.value ?? 0) / 60)
    const pufferMin = 15
    const gesamtMin = dauerMin + pufferMin

    const termin = new Date(terminZeit)
    if (Number.isNaN(termin.getTime())) return ''

    const abfahrt = new Date(termin.getTime() - gesamtMin * 60 * 1000)
    const abfahrtStr = abfahrt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin' })

    return `🚗 Fahrtzeit: ca. ${dauerMin} Min (+${pufferMin} Min Puffer)\n⏰ Losfahren um: ${abfahrtStr} Uhr`
  } catch {
    return ''
  }
}

/** ISO-Zeitstempel aus Kalenderzeile (datum + uhrzeit_von). */
export function kalenderTerminStartIso(datum: string, uhrzeitVon: string | null): string {
  const time = (uhrzeitVon ?? '09:00:00').slice(0, 8)
  return `${datum}T${time}`
}

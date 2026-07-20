import 'server-only'

import {
  getHandwerkerOffen,
  getHeutigeTermine,
  getNeueAnfragen,
  getOffeneAngebote,
  getOffeneRechnungen,
} from '@/lib/copilot/tools'
import { getAbfahrtszeit, kalenderTerminStartIso } from '@/lib/copilot/maps'
import { getWetter } from '@/lib/copilot/wetter'

function formatUhrzeit(uhrzeit: string | null): string {
  if (!uhrzeit) return '—'
  return uhrzeit.slice(0, 5)
}

export async function buildBriefing(): Promise<string> {
  const [anfragen, termine, angebote, rechnungen, handwerker, wetter] = await Promise.all([
    getNeueAnfragen(),
    getHeutigeTermine(),
    getOffeneAngebote(),
    getOffeneRechnungen(),
    getHandwerkerOffen(),
    getWetter(),
  ])

  const now = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'Europe/Berlin',
  })

  let msg = `🌲 <b>Guten Morgen Belal!</b>\n${now}\n\n`

  if (wetter) msg += `${wetter}\n\n`

  if (termine.length > 0) {
    msg += `📅 <b>Heute (${termine.length} Termine):</b>\n`
    for (const t of termine) {
      const zeit = formatUhrzeit(t.uhrzeit_von as string | null)
      const lead = t.leads as { kontakt_name?: string | null } | null
      const kunde = t.kunden as { name?: string | null } | null
      const name = kunde?.name ?? lead?.kontakt_name ?? '—'
      msg += `• ${zeit} Uhr — ${t.titel} (${name})\n`

      const adresse = (t.adresse as string | null)?.trim()
      if (adresse && process.env.GOOGLE_MAPS_API_KEY?.trim()) {
        const startIso = kalenderTerminStartIso(String(t.datum), t.uhrzeit_von as string | null)
        const abfahrt = await getAbfahrtszeit(adresse, startIso)
        if (abfahrt) msg += `  ${abfahrt}\n`
      }
    }
    msg += '\n'
  } else {
    msg += `📅 Keine Termine heute\n\n`
  }

  if (anfragen.length > 0) {
    msg += `🆕 <b>Neue Anfragen (${anfragen.length}):</b>\n`
    for (const a of anfragen) {
      const bereiche = ((a.bereiche as string[] | null) ?? []).join(', ')
      msg += `• ${a.kontakt_name ?? '—'} — ${bereiche || '—'} (${a.plz ?? ''})\n`
    }
    msg += '\n'
  }

  if (angebote.length > 0) {
    msg += `📋 <b>Offene Angebote (${angebote.length}):</b>\n`
    for (const a of angebote) {
      const lead = a.leads as { kontakt_name?: string | null; kunden?: { name?: string | null } | null } | null
      const name = lead?.kunden?.name ?? lead?.kontakt_name ?? '—'
      const tage = Math.floor((Date.now() - new Date(String(a.created_at)).getTime()) / (1000 * 60 * 60 * 24))
      msg += `• ${name} — ${a.leistungsumfang ?? '—'} (${tage} Tage offen)\n`
    }
    msg += '\n'
  }

  if (handwerker.length > 0) {
    msg += `👷 <b>Handwerker warten (${handwerker.length}):</b>\n`
    for (const h of handwerker) {
      const hw = h.handwerker as { name?: string | null } | null
      const ang = h.angebote as { leistungsumfang?: string | null } | null
      msg += `• ${hw?.name ?? '—'} — ${ang?.leistungsumfang ?? '—'}\n`
    }
    msg += '\n'
  }

  if (rechnungen.length > 0) {
    const gesamt = rechnungen.reduce((sum, r) => sum + (Number(r.brutto) || 0), 0)
    msg += `💶 <b>Offene Rechnungen: ${gesamt.toLocaleString('de-DE')} €</b>\n`
  }

  msg += `\n<i>Guten Start ins Projekt!</i>`
  return msg
}

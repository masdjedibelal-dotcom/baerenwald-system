import type { NaechsterSchritt } from '@/components/crm/NaechsteSchritteCard'
import type { AngebotStatusEinfach } from '@/lib/angebot-einfach'
import { kannHwEinreichungPruefen } from '@/lib/partner/handwerker-einreichung'
import type { AngebotHandwerkerRow, AuftragPosition } from '@/lib/types'

export function buildAngebotNaechsteSchritte(opts: {
  status: AngebotStatusEinfach
  angebotId: string
  auftragId?: string | null
  nachgefasst?: boolean
  onNachfassen?: () => void
  onAuftragAnlegen?: () => void
}): NaechsterSchritt[] {
  const { status, auftragId, nachgefasst = false, onNachfassen, onAuftragAnlegen } = opts

  const gesendet = status === 'gesendet' || status === 'abgelaufen'
  const nachfassErledigt =
    nachgefasst || status === 'angenommen' || status === 'abgelehnt' || Boolean(auftragId)
  const kannNachfassen =
    (status === 'gesendet' || status === 'abgelaufen') && !nachgefasst && !auftragId

  const steps: NaechsterSchritt[] = [
    {
      id: 'nachfassen',
      label: 'Angebot nachfassen',
      dateLabel: nachfassErledigt ? 'Erledigt' : kannNachfassen ? 'Als Nächstes' : '—',
      done: nachfassErledigt,
      onClick: kannNachfassen ? onNachfassen : undefined,
    },
    {
      id: 'auftrag',
      label: 'Auftrag anlegen',
      dateLabel: auftragId ? 'Erledigt' : gesendet ? 'Als Nächstes' : '—',
      done: Boolean(auftragId),
      onClick: gesendet && !auftragId ? onAuftragAnlegen : undefined,
      href: auftragId ? `/auftraege/${auftragId}` : undefined,
    },
  ]

  void opts.angebotId
  return steps
}

function handwerkerZugewiesen(
  positionen: AuftragPosition[],
  auftragHandwerkerCount: number
): boolean {
  if (positionen.length === 0) {
    return auftragHandwerkerCount > 0
  }
  return positionen.every((p) => Boolean(p.handwerker_id?.trim()))
}

function hwAngebotSchritt(rows: AngebotHandwerkerRow[]): {
  done: boolean
  dateLabel: string
  pendingReview: number
} {
  if (rows.length === 0) {
    return { done: true, dateLabel: '—', pendingReview: 0 }
  }

  const pendingReview = rows.filter((z) => kannHwEinreichungPruefen(z)).length
  if (pendingReview > 0) {
    return {
      done: false,
      dateLabel: `${pendingReview} zu prüfen`,
      pendingReview,
    }
  }

  const wartendAufPartner = rows.some((z) => {
    const st = (z.hw_status ?? '').toLowerCase()
    return Boolean(z.gesendet_at?.trim()) && !z.hw_eingereicht_at?.trim() && st !== 'uebernommen'
  })
  if (wartendAufPartner) {
    return { done: false, dateLabel: 'Wartet auf Partner', pendingReview: 0 }
  }

  const offeneRueckfrage = rows.some((z) => (z.hw_status ?? '').toLowerCase() === 'rueckfrage')
  if (offeneRueckfrage) {
    return { done: false, dateLabel: 'Rückfrage offen', pendingReview: 0 }
  }

  const erledigt = rows.every((z) => {
    const st = (z.hw_status ?? '').toLowerCase()
    if (!z.gesendet_at?.trim()) return true
    return st === 'uebernommen' || st === 'abgelehnt'
  })

  return {
    done: erledigt,
    dateLabel: erledigt ? 'Erledigt' : 'Offen',
    pendingReview: 0,
  }
}

export function buildAuftragNaechsteSchritte(opts: {
  status: string
  auftragId: string
  angebotId?: string | null
  hatAbnahme: boolean
  hatRechnung?: boolean
  positionen?: AuftragPosition[]
  auftragHandwerkerCount?: number
  angebotHandwerker?: AngebotHandwerkerRow[]
  bautagebuchCount?: number
  onHandwerkerZuweisen?: () => void
  onBautagebuch?: () => void
  onHwAngebot?: () => void
  onAbschluss?: () => void
  onRechnung?: () => void
  offeneMaengelCount?: number
  onMaengel?: () => void
}): NaechsterSchritt[] {
  const {
    status,
    auftragId,
    angebotId,
    hatAbnahme,
    hatRechnung = false,
    positionen = [],
    auftragHandwerkerCount = 0,
    angebotHandwerker = [],
    bautagebuchCount = 0,
    offeneMaengelCount = 0,
    onHandwerkerZuweisen,
    onBautagebuch,
    onHwAngebot,
    onAbschluss,
    onRechnung,
    onMaengel,
  } = opts

  if (status === 'storniert') return []

  const abgeschlossen = status === 'abgeschlossen'
  const hwZugewiesen = handwerkerZugewiesen(positionen, auftragHandwerkerCount)
  const hwAngebot = hwAngebotSchritt(angebotHandwerker)
  const bautagebuchDone = bautagebuchCount > 0

  const maengelErledigt = offeneMaengelCount === 0

  let naechsterId: string | null = null
  if (!abgeschlossen) {
    if (!hwZugewiesen) naechsterId = 'handwerker'
    else if (!hwAngebot.done && angebotId) naechsterId = 'hw-angebot'
    else if (offeneMaengelCount > 0) naechsterId = 'maengel'
    else naechsterId = 'abschluss'
  } else if (!hatRechnung) {
    naechsterId = 'rechnung'
  }

  const labelAlsNaechstes = (id: string, erledigt: boolean, fallback: string) => {
    if (erledigt) return 'Erledigt'
    if (naechsterId === id) return 'Als Nächstes'
    return fallback
  }

  const steps: NaechsterSchritt[] = [
    {
      id: 'handwerker',
      label: 'Handwerker zuweisen',
      dateLabel: labelAlsNaechstes('handwerker', hwZugewiesen || abgeschlossen, 'Offen'),
      done: hwZugewiesen || abgeschlossen,
      onClick: hwZugewiesen || abgeschlossen ? undefined : onHandwerkerZuweisen,
    },
    {
      id: 'hw-angebot',
      label: 'Handwerker-Angebot Rückmeldung',
      dateLabel: labelAlsNaechstes(
        'hw-angebot',
        hwAngebot.done || abgeschlossen || !angebotId,
        hwAngebot.dateLabel === '—' ? '—' : hwAngebot.dateLabel
      ),
      done: hwAngebot.done || abgeschlossen || !angebotId,
      onClick:
        hwAngebot.done || abgeschlossen || !angebotId ? undefined : onHwAngebot,
      href:
        !hwAngebot.done && !abgeschlossen && angebotId && !onHwAngebot
          ? `/angebote/${angebotId}`
          : undefined,
    },
    {
      id: 'bautagebuch',
      label: 'Bautagebuch anfordern / erstellen',
      dateLabel: bautagebuchDone || abgeschlossen ? 'Erledigt' : 'Optional',
      done: bautagebuchDone || abgeschlossen,
      onClick: bautagebuchDone || abgeschlossen ? undefined : onBautagebuch,
    },
    {
      id: 'abnahme',
      label: 'Abnahmeprotokoll (optional)',
      dateLabel: hatAbnahme ? 'Erledigt' : 'Optional',
      done: hatAbnahme,
      href: hatAbnahme ? undefined : `/auftraege/${auftragId}/abnahme/erstellen`,
    },
    {
      id: 'maengel',
      label:
        offeneMaengelCount > 0
          ? `Mängel beheben (${offeneMaengelCount} offen)`
          : 'Mängel-Nacharbeit (optional)',
      dateLabel: labelAlsNaechstes(
        'maengel',
        maengelErledigt || abgeschlossen || offeneMaengelCount === 0,
        offeneMaengelCount > 0 ? 'Offen' : '—'
      ),
      done: maengelErledigt || abgeschlossen,
      onClick:
        offeneMaengelCount > 0 && !abgeschlossen
          ? onMaengel
          : undefined,
      href:
        offeneMaengelCount > 0 && !onMaengel
          ? `/auftraege/${auftragId}/abnahme/maengel`
          : undefined,
    },
    {
      id: 'abschluss',
      label: 'Auftrag abschließen',
      dateLabel: labelAlsNaechstes('abschluss', abgeschlossen, '—'),
      done: abgeschlossen,
      onClick: !abgeschlossen ? onAbschluss : undefined,
    },
    {
      id: 'rechnung',
      label: 'Rechnung erstellen',
      dateLabel: labelAlsNaechstes('rechnung', hatRechnung, '—'),
      done: hatRechnung,
      onClick: abgeschlossen && !hatRechnung ? onRechnung : undefined,
    },
  ]

  return steps
}

export function buildRechnungNaechsteSchritte(opts: {
  status: string
  rechnungId: string
  auftragId?: string | null
  onSenden?: () => void
  onBezahlt?: () => void
}): NaechsterSchritt[] {
  const { status, rechnungId, auftragId, onSenden, onBezahlt } = opts
  const gesendet = status === 'gesendet' || status === 'bezahlt'
  const bezahlt = status === 'bezahlt'

  const steps: NaechsterSchritt[] = [
    {
      id: 'senden',
      label: 'Rechnung senden',
      dateLabel: gesendet ? 'Erledigt' : 'Optional',
      done: gesendet,
      onClick: gesendet ? undefined : onSenden,
    },
    {
      id: 'bezahlt',
      label: 'Als bezahlt markieren',
      dateLabel: bezahlt ? 'Erledigt' : '—',
      done: bezahlt,
      onClick: gesendet && !bezahlt ? onBezahlt : undefined,
    },
  ]

  if (auftragId) {
    steps.push({
      id: 'auftrag',
      label: 'Zum Auftrag',
      dateLabel: '',
      done: false,
      href: `/auftraege/${auftragId}`,
    })
  }

  void rechnungId
  return steps
}
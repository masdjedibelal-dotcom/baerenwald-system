import type { AngebotStatusEinfach } from '@/lib/angebot-einfach'
import type { NaechsterSchritt } from '@/components/crm/NaechsteSchritteCard'

export function buildAngebotNaechsteSchritte(opts: {
  status: AngebotStatusEinfach
  angebotId: string
  leadId?: string | null
  auftragId?: string | null
  onSenden?: () => void
  onAnnehmen?: () => void
}): NaechsterSchritt[] {
  const { status, angebotId, leadId, auftragId, onSenden, onAnnehmen } = opts
  const steps: NaechsterSchritt[] = []

  const gesendet = status === 'gesendet' || status === 'angenommen' || status === 'abgelehnt'
  steps.push({
    id: 'senden',
    label: 'Angebot senden',
    dateLabel: gesendet ? 'Erledigt' : 'Als Nächstes',
    done: gesendet,
    onClick: gesendet ? undefined : onSenden,
  })

  steps.push({
    id: 'angenommen',
    label: 'Angebot angenommen',
    dateLabel: status === 'angenommen' || auftragId ? 'Erledigt' : '—',
    done: status === 'angenommen' || Boolean(auftragId),
    onClick: status === 'gesendet' ? onAnnehmen : undefined,
  })

  steps.push({
    id: 'auftrag',
    label: 'Auftrag anlegen',
    dateLabel: auftragId ? 'Erledigt' : '—',
    done: Boolean(auftragId),
    href: auftragId ? `/auftraege/${auftragId}` : undefined,
  })

  if (leadId) {
    steps.push({
      id: 'anfrage',
      label: 'Zur Anfrage',
      dateLabel: '',
      done: false,
      href: `/anfragen/${leadId}`,
    })
  }

  void angebotId
  return steps.filter((s) => s.id !== 'anfrage' || leadId)
}

export function buildAuftragNaechsteSchritte(opts: {
  status: string
  auftragId: string
  hatAbnahme: boolean
  rechnungenCount: number
}): NaechsterSchritt[] {
  const { status, auftragId, hatAbnahme, rechnungenCount } = opts
  const abgeschlossen = status === 'abgeschlossen'

  return [
    {
      id: 'abnahme',
      label: 'Abnahme durchführen',
      dateLabel: hatAbnahme || abgeschlossen ? 'Erledigt' : '—',
      done: hatAbnahme || abgeschlossen,
      href: hatAbnahme || abgeschlossen ? undefined : `/auftraege/${auftragId}/abnahme`,
    },
    {
      id: 'rechnung',
      label: 'Rechnung erstellen',
      dateLabel: rechnungenCount > 0 ? 'Erledigt' : '—',
      done: rechnungenCount > 0,
      href: rechnungenCount > 0 ? undefined : `/auftraege/${auftragId}/rechnungen-auswahl`,
    },
    {
      id: 'abschluss',
      label: 'Auftrag abschließen',
      dateLabel: abgeschlossen ? 'Erledigt' : '—',
      done: abgeschlossen,
      href: abgeschlossen ? undefined : `/auftraege/${auftragId}/abschluss`,
    },
  ]
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
      dateLabel: gesendet ? 'Erledigt' : 'Als Nächstes',
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

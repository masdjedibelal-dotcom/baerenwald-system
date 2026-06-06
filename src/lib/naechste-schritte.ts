import type { AngebotStatusEinfach } from '@/lib/angebot-einfach'
import type { NaechsterSchritt } from '@/components/crm/NaechsteSchritteCard'
import type { AngebotHandwerkerRow } from '@/lib/types'
import {
  darfAngebotAnKundeSenden,
  handwerkerAnfrageErledigt,
  handwerkerEinreichungErledigt,
  handwerkerFreigabeErledigt,
  hatAngebotHandwerker,
} from '@/lib/angebote/angebot-handwerker-flow'

export function buildAngebotNaechsteSchritte(opts: {
  status: AngebotStatusEinfach
  angebotId: string
  angebotStatusRaw?: string | null
  handwerkerRows?: AngebotHandwerkerRow[]
  leadId?: string | null
  auftragId?: string | null
  onHandwerkerAnfragen?: () => void
  onHandwerkerBestaetigen?: () => void
  onSenden?: () => void
  onAnnehmen?: () => void
}): NaechsterSchritt[] {
  const {
    status,
    angebotId,
    angebotStatusRaw,
    handwerkerRows = [],
    leadId,
    auftragId,
    onHandwerkerAnfragen,
    onHandwerkerBestaetigen,
    onSenden,
    onAnnehmen,
  } = opts
  const steps: NaechsterSchritt[] = []
  const hatHw = hatAngebotHandwerker(handwerkerRows)
  const hwAnfrageDone = !hatHw || handwerkerAnfrageErledigt(handwerkerRows)
  const hwEinreichungDone = !hatHw || handwerkerEinreichungErledigt(handwerkerRows)
  const hwFreigabeDone = !hatHw || handwerkerFreigabeErledigt(handwerkerRows)
  const darfKunde = darfAngebotAnKundeSenden(handwerkerRows, angebotStatusRaw)

  if (hatHw) {
    steps.push({
      id: 'hw_anfragen',
      label: 'Handwerker anfragen',
      dateLabel: hwAnfrageDone ? 'Erledigt' : 'Als Nächstes',
      done: hwAnfrageDone,
      onClick: hwAnfrageDone ? undefined : onHandwerkerAnfragen,
    })
    steps.push({
      id: 'hw_einreichung',
      label: 'Partner-Angebot / Rechnung einholen',
      dateLabel: hwEinreichungDone ? 'Erledigt' : hwAnfrageDone ? 'Als Nächstes' : '—',
      done: hwEinreichungDone,
      href: !hwEinreichungDone && hwAnfrageDone ? `#handwerker-partner` : undefined,
    })
    steps.push({
      id: 'hw_freigabe',
      label: 'Partner-Einreichung bestätigen',
      dateLabel: hwFreigabeDone ? 'Erledigt' : hwEinreichungDone ? 'Als Nächstes' : '—',
      done: hwFreigabeDone,
      onClick: hwFreigabeDone || !hwEinreichungDone ? undefined : onHandwerkerBestaetigen,
      href: !hwFreigabeDone && hwEinreichungDone ? `#handwerker-partner` : undefined,
    })
  } else {
    steps.push({
      id: 'hw_zuweisen',
      label: 'Handwerker zuweisen & anfragen',
      dateLabel: 'Als Nächstes',
      done: false,
      onClick: onHandwerkerAnfragen,
    })
  }

  const gesendet = status === 'gesendet' || status === 'angenommen' || status === 'abgelehnt'
  steps.push({
    id: 'senden',
    label: 'Angebot an Kunden senden',
    dateLabel: gesendet ? 'Erledigt' : darfKunde ? 'Als Nächstes' : '—',
    done: gesendet,
    onClick: gesendet || !darfKunde ? undefined : onSenden,
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
  const hatRechnung = rechnungenCount > 0

  return [
    {
      id: 'abnahme',
      label: '1. Abnahmeprotokoll',
      dateLabel: hatAbnahme || abgeschlossen ? 'Erledigt' : 'Als Nächstes',
      done: hatAbnahme || abgeschlossen,
      href: hatAbnahme || abgeschlossen ? undefined : `/auftraege/${auftragId}/abnahme`,
    },
    {
      id: 'rechnung',
      label: '2. Rechnung erstellen',
      dateLabel: hatRechnung ? 'Erledigt' : hatAbnahme ? 'Als Nächstes' : '—',
      done: hatRechnung,
      href:
        hatRechnung || !hatAbnahme
          ? undefined
          : `/auftraege/${auftragId}/rechnungen-auswahl`,
    },
    {
      id: 'abschluss',
      label: '3. Auftrag abschließen',
      dateLabel: abgeschlossen ? 'Erledigt' : hatAbnahme && hatRechnung ? 'Als Nächstes' : '—',
      done: abgeschlossen,
      href:
        abgeschlossen || !hatAbnahme || !hatRechnung
          ? undefined
          : `/auftraege/${auftragId}/abschluss`,
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

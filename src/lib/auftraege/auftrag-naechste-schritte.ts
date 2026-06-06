import type { LeadSchritt } from '@/components/anfragen/LeadNaechsteSchritteCard'
import type { AuftragDetail, AuftragStatus } from '@/lib/types'

export type AuftragNaechsteSchritteOpts = {
  onHandwerkerZuweisen?: () => void
  onBaustart?: () => void
  onZurAbnahme?: () => void
  onAbnahmeAbschliessen?: () => void
  onRechnung?: () => void
}

function positionenOhneHandwerker(detail: AuftragDetail): number {
  return (detail.auftrag_positionen ?? []).filter((p) => !p.handwerker_id).length
}

function handwerkerSchrittErledigt(detail: AuftragDetail): boolean {
  const pos = detail.auftrag_positionen ?? []
  if (pos.length === 0) {
    return (detail.auftrag_handwerker ?? []).some((z) =>
      ['zugewiesen', 'akzeptiert'].includes(String(z.status ?? '').toLowerCase())
    )
  }
  return positionenOhneHandwerker(detail) === 0
}

/** Checkliste für Tab „Übersicht“ — Vorbereitung statt großer Status-Buttons. */
export function buildAuftragNaechsteSchritte(
  detail: AuftragDetail,
  opts: AuftragNaechsteSchritteOpts & { hatPositionen?: boolean } = {}
): LeadSchritt[] {
  const status = detail.status as AuftragStatus
  const hwDone = handwerkerSchrittErledigt(detail)
  const baustartDone = status !== 'offen' && status !== 'storniert'
  const inAusfuehrung = status === 'in_arbeit' || status === 'abnahme' || status === 'abgeschlossen'
  const zurAbnahmeDone = Boolean(detail.abnahme_protokoll_url) || status === 'abgeschlossen'
  const abnahmeDone = Boolean(detail.abnahme_protokoll_url) || status === 'abgeschlossen'

  const steps: LeadSchritt[] = [
    {
      id: 'angelegt',
      label: 'Auftrag angelegt',
      dateLabel: 'Erledigt',
      done: true,
    },
    {
      id: 'handwerker',
      label: 'Handwerker zuweisen',
      dateLabel: hwDone ? 'Erledigt' : 'Offen',
      done: hwDone,
      onClick: hwDone ? undefined : opts.onHandwerkerZuweisen,
    },
    {
      id: 'baustart',
      label: 'Kunde informieren & Baustart',
      dateLabel: baustartDone ? 'Erledigt' : '—',
      done: baustartDone,
      onClick: baustartDone || status === 'storniert' ? undefined : opts.onBaustart,
    },
    {
      id: 'ausfuehrung',
      label: 'Ausführung auf der Baustelle',
      dateLabel: inAusfuehrung ? (status === 'in_arbeit' ? 'Läuft' : 'Erledigt') : '—',
      done: zurAbnahmeDone || abnahmeDone,
    },
    {
      id: 'abnahme',
      label: 'Abnahme durchführen',
      dateLabel: abnahmeDone ? 'Erledigt' : zurAbnahmeDone ? 'Läuft' : '—',
      done: abnahmeDone,
      onClick:
        status === 'in_arbeit' && !zurAbnahmeDone ? opts.onZurAbnahme : undefined,
    },
    {
      id: 'abschluss',
      label: 'Abnahme abschließen',
      dateLabel: abnahmeDone ? 'Erledigt' : '—',
      done: abnahmeDone,
      onClick: status === 'abnahme' ? opts.onAbnahmeAbschliessen : undefined,
    },
    {
      id: 'rechnung',
      label: 'Rechnung erstellen',
      dateLabel: abnahmeDone && opts.hatPositionen ? 'Bereit' : '—',
      done: false,
      onClick:
        abnahmeDone && opts.hatPositionen && status !== 'abgeschlossen'
          ? opts.onRechnung
          : undefined,
      href:
        abnahmeDone && opts.hatPositionen && status !== 'abgeschlossen'
          ? `/rechnungen/neu?auftrag_id=${detail.id}`
          : undefined,
    },
  ]

  if (status === 'storniert') {
    return steps.filter((s) => s.id === 'angelegt')
  }

  return steps
}

/** Nächster sinnvoller Schritt für den Primary-Button im Kopf. */
export function ersterOffenerAuftragSchritt(steps: LeadSchritt[]): LeadSchritt | null {
  const priority = ['handwerker', 'baustart', 'abnahme', 'abschluss', 'rechnung']
  for (const id of priority) {
    const s = steps.find((x) => x.id === id)
    if (s && !s.done && (s.onClick || s.href)) return s
  }
  return null
}

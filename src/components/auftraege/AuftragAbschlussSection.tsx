'use client'

import { useEffect, useState, useTransition } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { getAbschlussdokuVorschau } from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { formatDatum } from '@/lib/utils'

type Vorschau = {
  positionenCount: number
  bautagebuchCount: number
  fotoCount: number
  hasAbnahme: boolean
  hasRechnung: boolean
  rechnungsnummer: string | null
  hasKundeEmail: boolean
}

function statusBadge(ok: boolean, labelOk: string, labelOff: string) {
  if (ok) {
    return (
      <MockBadge kind="aktiv">
        <MockIcon ctx="btn" n="check" size={10} /> {labelOk}
      </MockBadge>
    )
  }
  return (
    <MockBadge kind="fertig">
      <MockIcon ctx="btn" n="hourglass" size={10} /> {labelOff}
    </MockBadge>
  )
}

/**
 * Übersicht Abschlussdokumentation — Design analog Zahlplan:
 * Status-Zeilen + CTA zum Erstellen/Versenden.
 */
export function AuftragAbschlussSection({
  auftragId,
  istAbgeschlossen,
  abschlussUrl,
  abschlussGesendetAt,
  onCreate,
  onRefresh,
}: {
  auftragId: string
  istAbgeschlossen: boolean
  abschlussUrl?: string | null
  abschlussGesendetAt?: string | null
  onCreate: () => void
  onRefresh?: () => void
}) {
  const [vorschau, setVorschau] = useState<Vorschau | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const v = await getAbschlussdokuVorschau(auftragId)
        setVorschau(v)
      } catch {
        toast.error('Vorschau konnte nicht geladen werden.')
      }
    })
  }, [auftragId])

  const rows = [
    {
      label: 'Leistungen',
      hint: vorschau ? `${vorschau.positionenCount} Positionen` : '—',
      ok: (vorschau?.positionenCount ?? 0) > 0,
    },
    {
      label: 'Abnahmeprotokoll',
      hint: vorschau?.hasAbnahme ? 'Vorhanden' : 'Noch offen',
      ok: Boolean(vorschau?.hasAbnahme),
    },
    {
      label: 'Bautagebuch',
      hint: vorschau ? `${vorschau.bautagebuchCount} Einträge` : '—',
      ok: (vorschau?.bautagebuchCount ?? 0) > 0,
    },
    {
      label: 'Fotodokumentation',
      hint: vorschau ? `${vorschau.fotoCount} Fotos` : '—',
      ok: (vorschau?.fotoCount ?? 0) > 0,
    },
    {
      label: 'Rechnung',
      hint: vorschau?.rechnungsnummer?.trim() || (vorschau?.hasRechnung ? 'Vorhanden' : 'Optional'),
      ok: Boolean(vorschau?.hasRechnung),
    },
    {
      label: 'Kunden-E-Mail',
      hint: vorschau?.hasKundeEmail ? 'Hinterlegt' : 'Fehlt für Versand',
      ok: Boolean(vorschau?.hasKundeEmail),
    },
  ]

  return (
    <MockCard
      title="Abschlussdokumentation"
      icon="checks"
      actions={
        <MockBtn
          sm
          kind="primary"
          icon={istAbgeschlossen ? 'mail' : 'checks'}
          onClick={onCreate}
          disabled={pending}
        >
          {istAbgeschlossen ? 'Erneut erstellen / versenden' : 'Abschlussdokumentation erstellen'}
        </MockBtn>
      }
    >
      <div className="zahlplan-summary">
        <span className="zahlplan-summary__left">
          {istAbgeschlossen
            ? abschlussGesendetAt
              ? `Versendet am ${formatDatum(abschlussGesendetAt)}`
              : 'Auftrag abgeschlossen'
            : 'Übersicht der Unterlagen für den Abschluss'}
        </span>
        <b className="zahlplan-summary__right">
          {istAbgeschlossen ? 'Abgeschlossen' : 'In Arbeit'}
        </b>
      </div>

      {!vorschau ? (
        <p className="text-sm text-bw-text-muted py-4">Lädt Übersicht…</p>
      ) : (
        <div className="zahlplan-table-wrap" style={{ marginTop: 12 }}>
          <div className="list-row head zahlplan-row">
            <div>Bestandteil</div>
            <div>Hinweis</div>
            <div>Status</div>
            <div />
          </div>
          {rows.map((r) => (
            <div key={r.label} className="list-row zahlplan-row">
              <div className="zahlplan-row__label">{r.label}</div>
              <div className="zahlplan-row__faellig">{r.hint}</div>
              <div>{statusBadge(r.ok, 'Bereit', 'Offen')}</div>
              <div />
            </div>
          ))}
        </div>
      )}

      {abschlussUrl?.trim() ? (
        <div style={{ marginTop: 14 }}>
          <a
            className="link"
            href={abschlussUrl.trim()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13 }}
          >
            <MockIcon ctx="default" n="download" size={14} /> Gespeicherte Abschlussdokumentation öffnen
          </a>
        </div>
      ) : null}

      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
        Hier siehst du, was für die Abschlussdokumentation schon vorliegt. Mit „Erstellen“ wählst du
        Anlagen, erzeugst das PDF und kannst es optional per E-Mail versenden — das Portal wird
        dabei mit aktualisiert.
      </p>
    </MockCard>
  )
}

'use client'

import { useEffect, useState, useTransition } from 'react'
import { MockCard } from '@/components/mock-ui/MockCard'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import {
  createAbschlussberichtPdf,
  getAbschlussdokuVorschau,
} from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { formatDatum } from '@/lib/utils'

type Vorschau = {
  positionenCount: number
  bautagebuchCount: number
  fotoCount: number
  hasAbnahme: boolean
  hasAbschlussbericht: boolean
  hasRechnung: boolean
  rechnungsnummer: string | null
  hasKundeEmail: boolean
  abschlussUrl: string | null
}

/**
 * Abschlussbericht-Tab — Bericht erstellen (nach signiertem Protokoll),
 * danach Neu erstellen + PDF. Versand läuft über „Auftrag abschließen“.
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
  /** @deprecated — Erstellen läuft lokal; optional Fallback */
  onCreate?: () => void
  onRefresh?: () => void
}) {
  const [vorschau, setVorschau] = useState<Vorschau | null>(null)
  const [pending, startTransition] = useTransition()

  function reload() {
    startTransition(async () => {
      try {
        const v = await getAbschlussdokuVorschau(auftragId)
        setVorschau(v)
      } catch {
        toast.error('Vorschau konnte nicht geladen werden.')
      }
    })
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auftragId])

  const hasAbnahme = Boolean(vorschau?.hasAbnahme)
  const url = (abschlussUrl ?? vorschau?.abschlussUrl)?.trim() || null
  const hatBericht = Boolean(url)

  function berichtErstellen() {
    if (!hasAbnahme) {
      toast.error('Zuerst Abnahmeprotokoll signieren / abschließen.')
      return
    }
    startTransition(async () => {
      const r = await createAbschlussberichtPdf(auftragId)
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success('Abschlussbericht erstellt')
      reload()
      onRefresh?.()
    })
  }

  return (
    <MockCard
      title="Abschlussbericht"
      icon="file-text"
      actions={
        hatBericht ? (
          <>
            <MockBtn sm kind="ghost" icon="download" onClick={() => window.open(url!, '_blank')}>
              PDF
            </MockBtn>
            <MockBtn sm kind="primary" icon="plus" onClick={berichtErstellen} disabled={pending || !hasAbnahme}>
              Neu erstellen
            </MockBtn>
          </>
        ) : (
          <MockBtn
            sm
            kind="primary"
            icon="file-text"
            onClick={berichtErstellen}
            disabled={pending || !hasAbnahme}
          >
            Bericht erstellen
          </MockBtn>
        )
      }
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-3)', lineHeight: 1.45, maxWidth: 520 }}>
          Automatisch zusammengestellt aus Leistungen, Bautagebuch und Abnahmeprotokoll. Versand an
          den Kunden läuft über „Auftrag abschließen“.
        </p>
        <MockBadge kind={hatBericht ? (istAbgeschlossen ? 'aktiv' : 'fertig') : 'fertig'}>
          {hatBericht ? (abschlussGesendetAt ? 'Versendet' : 'Entwurf') : 'Offen'}
        </MockBadge>
      </div>

      {!vorschau ? (
        <p className="text-sm text-bw-text-muted py-2">Lädt Übersicht…</p>
      ) : null}

      {!hasAbnahme && vorschau ? (
        <div
          style={{
            marginBottom: 12,
            padding: '10px 12px',
            borderRadius: 10,
            border: '0.5px solid var(--amber-border, #f0d9a8)',
            background: 'var(--amber-50, #fff8eb)',
            fontSize: 13,
            color: 'var(--text-2)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <MockIcon ctx="default" n="alert-triangle" size={15} />
          <span>
            Abnahmeprotokoll noch nicht signiert — im Tab „Abnahmeprotokoll“ abschließen.
          </span>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {!hatBericht ? (
          <MockBtn
            kind="primary"
            icon="file-text"
            onClick={berichtErstellen}
            disabled={pending || !hasAbnahme}
          >
            Bericht erstellen
          </MockBtn>
        ) : (
          <>
            <MockBtn kind="primary" icon="plus" onClick={berichtErstellen} disabled={pending || !hasAbnahme}>
              Neu erstellen
            </MockBtn>
            <a
              className="link"
              href={url!}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <MockIcon ctx="default" n="download" size={14} /> PDF öffnen
            </a>
          </>
        )}
      </div>

      {!hasAbnahme ? (
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>
          Der Bericht kann erstellt werden, sobald das Abnahmeprotokoll signiert ist.
        </p>
      ) : hatBericht && abschlussGesendetAt ? (
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>
          Versendet am {formatDatum(abschlussGesendetAt)}
        </p>
      ) : null}

      {vorschau ? (
        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gap: 6,
            fontSize: 12.5,
            color: 'var(--text-3)',
          }}
        >
          <span>
            Leistungen: <b style={{ color: 'var(--text)' }}>{vorschau.positionenCount}</b>
          </span>
          <span>
            Bautagebuch: <b style={{ color: 'var(--text)' }}>{vorschau.bautagebuchCount}</b> Einträge
          </span>
          <span>
            Abnahme: <b style={{ color: 'var(--text)' }}>{hasAbnahme ? 'Vorhanden' : 'Offen'}</b>
          </span>
        </div>
      ) : null}
    </MockCard>
  )
}

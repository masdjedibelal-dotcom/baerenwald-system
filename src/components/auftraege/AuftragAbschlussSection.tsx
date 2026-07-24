'use client'

import { useEffect, useState, useTransition } from 'react'
import { MockBadge, MockBtn } from '@/components/mock-ui/MockPrimitives'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { WerkzeugPanel } from '@/components/crm/WerkzeugPanel'
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
 * Abschlussbericht — Checkliste + eine Primäraktion (kein Mini-CRM).
 */
export function AuftragAbschlussSection({
  auftragId,
  istAbgeschlossen,
  abschlussUrl,
  abschlussGesendetAt,
  onCreate: _onCreate,
  onRefresh,
  embedded,
}: {
  auftragId: string
  istAbgeschlossen: boolean
  abschlussUrl?: string | null
  abschlussGesendetAt?: string | null
  /** @deprecated — Erstellen läuft lokal; optional Fallback */
  onCreate?: () => void
  onRefresh?: () => void
  /** Im Vor-Ort-Flow: Nummerierung im Titel */
  embedded?: boolean
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
      toast.error('Zuerst Abnahmeprotokoll als PDF erstellen.')
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

  const badge = (
    <MockBadge kind={hatBericht ? (istAbgeschlossen ? 'aktiv' : 'fertig') : 'fertig'}>
      {hatBericht ? (abschlussGesendetAt ? 'Versendet' : 'Entwurf') : 'Offen'}
    </MockBadge>
  )

  return (
    <WerkzeugPanel
      title={embedded ? '3 · Abschlussbericht' : 'Abschlussbericht'}
      icon="file-text"
      purpose="Aus den Leistungen oben, dem Tagebuch und der Abnahme zusammensetzen. Versand an den Kunden über „Auftrag abschließen“."
      actions={badge}
    >
      {!vorschau ? (
        <p className="text-sm text-bw-text-muted py-2">Lädt Übersicht…</p>
      ) : (
        <ul className="werkzeug-check">
          <li>
            <span
              className={vorschau.positionenCount > 0 ? 'werkzeug-check__ok' : 'werkzeug-check__open'}
              aria-hidden
            >
              {vorschau.positionenCount > 0 ? '✓' : '○'}
            </span>
            Leistungen ({vorschau.positionenCount})
          </li>
          <li>
            <span
              className={
                vorschau.bautagebuchCount > 0 ? 'werkzeug-check__ok' : 'werkzeug-check__open'
              }
              aria-hidden
            >
              {vorschau.bautagebuchCount > 0 ? '✓' : '○'}
            </span>
            Bautagebuch ({vorschau.bautagebuchCount})
          </li>
          <li>
            <span className={hasAbnahme ? 'werkzeug-check__ok' : 'werkzeug-check__open'} aria-hidden>
              {hasAbnahme ? '✓' : '○'}
            </span>
            Abnahmeprotokoll {hasAbnahme ? 'vorhanden' : 'fehlt'}
          </li>
          <li>
            <span className={hatBericht ? 'werkzeug-check__ok' : 'werkzeug-check__open'} aria-hidden>
              {hatBericht ? '✓' : '○'}
            </span>
            Abschlussbericht {hatBericht ? 'erstellt' : 'offen'}
          </li>
        </ul>
      )}

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
          <span>Zuerst in der Leistungstabelle Abnahme setzen und als PDF speichern.</span>
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
            <MockBtn
              kind="primary"
              icon="plus"
              onClick={berichtErstellen}
              disabled={pending || !hasAbnahme}
            >
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

      {hatBericht && abschlussGesendetAt ? (
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>
          Versendet am {formatDatum(abschlussGesendetAt)}
        </p>
      ) : null}
    </WerkzeugPanel>
  )
}

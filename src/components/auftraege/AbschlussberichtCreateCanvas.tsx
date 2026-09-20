'use client'

import { MockEmpty } from '@/components/mock-ui'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { afterServerActionRefresh } from '@/lib/crm-client-refresh'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentCanvas } from '@/components/surfaces/DocumentCanvas'
import { createAbschlussberichtPdf } from '@/app/(dashboard)/auftraege/abschlussdokumentation-actions'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'
import { TOAST } from '@/lib/copy'

export type AbschlussCanvasLeistung = {
  id: string
  titel: string
  beschreibung: string | null
  preisNetto: number | null
}

export type AbschlussCanvasGewerkGruppe = {
  gewerk: string
  leistungen: AbschlussCanvasLeistung[]
}

export type AbschlussCanvasBautagebuch = {
  id: string
  datumLabel: string
  titel: string
  beschreibung: string | null
}

export type AbschlussberichtCreateCanvasProps = {
  auftragId: string
  auftragsLabel: string
  kundeName: string
  zeitraumLabel: string
  gewerkGruppen: AbschlussCanvasGewerkGruppe[]
  gesamtNetto: number | null
  bautagebuch: AbschlussCanvasBautagebuch[]
  hasAbnahme: boolean
  hasAbschlussbericht: boolean
  abschlussUrl: string | null
}

export function AbschlussberichtCreateCanvas({
  auftragId,
  auftragsLabel,
  kundeName,
  zeitraumLabel,
  gewerkGruppen,
  bautagebuch,
  hasAbnahme,
  hasAbschlussbericht,
  abschlussUrl,
}: AbschlussberichtCreateCanvasProps) {
  const router = useRouter()
  const [pending, startTransition] = useLocalTransition()

  const subtitle = useMemo(
    () => [auftragsLabel, kundeName].filter(Boolean).join(' · '),
    [auftragsLabel, kundeName]
  )

  const canCreate = hasAbnahme
  const badgeLabel = hasAbschlussbericht ? 'Erstellt' : 'Entwurf'

  function onClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/auftraege/${auftragId}`)
  }

  function erstellen() {
    if (!canCreate) {
      toast.error(TOAST.abschlussbericht_erst_nach_signiertem_abnahmepro)
      return
    }
    startTransition(async () => {
      const r = await createAbschlussberichtPdf(auftragId)
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.abschlussbericht_erstellt)
      router.push(`/auftraege/${auftragId}`)
      afterServerActionRefresh()
    })
  }

  const footerCta = !canCreate ? (
    <p className="abschluss-canvas-footer__hint">
      Der Bericht kann erstellt werden, sobald das Abnahmeprotokoll signiert ist.
    </p>
  ) : hasAbschlussbericht && abschlussUrl ? (
    <p className="abschluss-canvas-footer__hint">
      Es liegt bereits ein Bericht vor — erneut erstellen überschreibt ihn.
    </p>
  ) : null

  return (
    <DocumentCanvas
      portal
      manageHistory={false}
      title="Abschlussbericht"
      subtitle={subtitle || undefined}
      onClose={onClose}
      footerCta={footerCta}
      className="wizard-flow abschluss-canvas"
      primaryAction={{
        label: 'Bericht erstellen',
        onClick: erstellen,
        busy: pending,
        getGaps: () =>
          canCreate
            ? []
            : [
                {
                  id: 'abnahme',
                  label: 'signiertes Abnahmeprotokoll',
                },
              ],
      }}
    >
      <div className="abschluss-canvas">
        <div className="abschluss-canvas__head">
          <h2 className="abschluss-canvas__title">
            <MockIcon ctx="default" n="file-text" size={18} />
            Abschlussbericht
          </h2>
          <span className={cn('badge', hasAbschlussbericht ? 'aktiv' : 'warten')}>
            {badgeLabel}
          </span>
        </div>

        <p className="abschluss-canvas-intro">
          Automatisch zusammengestellt aus Leistungen, Bautagebuch und Abnahmeprotokoll — als
          Dokumentationsbericht ohne Rechnungsbeträge. Optional als Anhang zur Rechnung /
          Endabrechnung.
        </p>

        <div className="abschluss-canvas-meta">
          <div className="abschluss-canvas-meta__cell">
            <span className="abschluss-canvas-meta__lbl">Auftrag</span>
            <span className="abschluss-canvas-meta__val">{auftragsLabel || '—'}</span>
          </div>
          <div className="abschluss-canvas-meta__cell">
            <span className="abschluss-canvas-meta__lbl">Kunde</span>
            <span className="abschluss-canvas-meta__val">{kundeName || '—'}</span>
          </div>
          <div className="abschluss-canvas-meta__cell">
            <span className="abschluss-canvas-meta__lbl">Zeitraum</span>
            <span className="abschluss-canvas-meta__val">{zeitraumLabel || '—'}</span>
          </div>
        </div>

        <section className="abschluss-canvas-sec" data-doc-section="leistungen">
          <h3 className="abschluss-canvas-sec__h">Ausgeführte Leistungen</h3>
          {gewerkGruppen.length === 0 ? (
            <MockEmpty title="Keine Leistungen vorhanden." />
          ) : (
            <div className="abschluss-canvas-leistungen">
              {gewerkGruppen.map((g) => (
                <div key={g.gewerk} className="abschluss-canvas-gewerk">
                  <div className="abschluss-canvas-gewerk__h">{g.gewerk}</div>
                  {g.leistungen.map((l) => (
                    <div key={l.id} className="abschluss-canvas-pos">
                      <div className="abschluss-canvas-pos__main">
                        <div className="abschluss-canvas-pos__titel">{l.titel}</div>
                        {l.beschreibung ? (
                          <div className="abschluss-canvas-pos__desc">{l.beschreibung}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="abschluss-canvas-sec">
          <h3 className="abschluss-canvas-sec__h">Bautagebuch · Verlauf</h3>
          {bautagebuch.length === 0 ? (
            <p className="abschluss-canvas-empty">Noch keine Bautagebuch-Einträge.</p>
          ) : (
            <ul className="abschluss-canvas-btb">
              {bautagebuch.map((e) => (
                <li key={e.id} className="abschluss-canvas-btb__item">
                  <span className="abschluss-canvas-btb__date">{e.datumLabel}</span>
                  <div className="abschluss-canvas-btb__body">
                    <div className="abschluss-canvas-btb__titel">{e.titel}</div>
                    {e.beschreibung ? (
                      <div className="abschluss-canvas-btb__desc">{e.beschreibung}</div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="abschluss-canvas-sec" data-doc-section="abnahme">
          <h3 className="abschluss-canvas-sec__h">Abnahme</h3>
          {hasAbnahme ? (
            <div className="abschluss-canvas-abnahme abschluss-canvas-abnahme--ok" role="status">
              <MockIcon ctx="default" n="circle-check-filled" size={16} />
              <p>Abnahmeprotokoll liegt vor und ist signiert.</p>
            </div>
          ) : (
            <div className="abschluss-canvas-abnahme" role="status">
              <MockIcon ctx="default" n="clock" size={16} />
              <p>
                Abnahmeprotokoll noch nicht signiert — im Tab „Abnahmeprotokoll“ abschließen.
              </p>
            </div>
          )}
        </section>
      </div>
    </DocumentCanvas>
  )
}

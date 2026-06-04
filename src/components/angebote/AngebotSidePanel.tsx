'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { ExternalLink } from 'lucide-react'
import { SidePanel } from '@/components/ui/SidePanel'
import { AngebotStatusBadge } from '@/components/ui/AngebotStatusBadge'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AngebotVersandSection } from '@/components/angebote/AngebotVersandSection'
import { createClient } from '@/lib/supabase'
import { updateAngebotNotizen } from '@/app/(dashboard)/angebote/actions'
import type { AngebotDetail, AngebotListeEintrag } from '@/lib/types'
import { normalizeAngebotPositionen, summenAusPositionen } from '@/lib/angebot-positionen'
import { defaultFirmenEinstellungen } from '@/lib/einstellungen-keys'
import { betragAnzeige, kundeNameAusAngebot } from '@/lib/angebot-einfach'
import { toast } from '@/components/ui/app-toast'
import { cn } from '@/lib/utils'

type TabId = 'positionen' | 'versand' | 'notizen'

function kundenName(d: AngebotDetail | AngebotListeEintrag | null) {
  return d ? kundeNameAusAngebot(d) : 'Ohne Kunde'
}

export function AngebotSidePanel({
  open,
  onClose,
  angebotId,
  summary,
}: {
  open: boolean
  onClose: () => void
  angebotId: string | null
  summary?: AngebotListeEintrag | null
}) {
  const [detail, setDetail] = useState<AngebotDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<TabId>('positionen')
  const [notizen, setNotizen] = useState('')
  const [pending, startTransition] = useTransition()

  const load = useCallback(async () => {
    if (!angebotId) return
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('angebote')
      .select(
        `
        *,
        kunden(*),
        leads(*),
        angebot_handwerker(
          *,
          handwerker(id, name, email, telefon, gewerke, aktiv),
          gewerke(id, name, slug)
        )
      `
      )
      .eq('id', angebotId)
      .maybeSingle()
    setLoading(false)
    if (error || !data) {
      if (error) console.warn('AngebotSidePanel', error.message)
      setDetail(null)
      return
    }
    const row = data as AngebotDetail
    setDetail({
      ...row,
      positionen: normalizeAngebotPositionen(row.positionen),
    })
    setNotizen(row.notizen ?? '')
  }, [angebotId])

  useEffect(() => {
    if (!open || !angebotId) {
      setDetail(null)
      return
    }
    void load()
  }, [open, angebotId, load])

  const display = detail ?? summary
  const title = display ? `Angebot — ${kundenName(display)}` : 'Angebot'
  const pos = useMemo(
    () => normalizeAngebotPositionen(display?.positionen ?? []),
    [display?.positionen]
  )
  const summen = useMemo(() => summenAusPositionen(pos, 19), [pos])
  const firmDef = defaultFirmenEinstellungen()
  const gueltigTage = Math.max(1, parseInt(firmDef.angebot_gueltig_tage, 10) || 30)
  const gueltigBis = useMemo(
    () => new Date(Date.now() + gueltigTage * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE'),
    [gueltigTage]
  )

  const bruttoMin = summen.bruttoMin
  const bruttoMax = summen.bruttoMax

  function saveNotizen() {
    if (!angebotId) return
    startTransition(async () => {
      const res = await updateAngebotNotizen(angebotId, notizen)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Notizen gespeichert')
      await load()
    })
  }

  const status = display?.status

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={title}
      badge={status ? <AngebotStatusBadge status={status} /> : undefined}
      width="lg"
      actions={
        angebotId ? (
          <Link
            href={`/angebote/${angebotId}`}
            className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-bw-link"
          >
            Vollansicht
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        ) : null
      }
    >
      {loading && !detail ? (
        <p className="p-4 text-sm text-bw-text-muted">Laden…</p>
      ) : !display ? (
        <p className="p-4 text-sm text-bw-text-muted">Keine Daten.</p>
      ) : (
        <>
          <div className="flex gap-1 border-b border-bw-border px-4">
            {(
              [
                ['positionen', 'Positionen'],
                ['versand', 'Versand'],
                ['notizen', 'Notizen'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  tab === id
                    ? 'border-bw-primary text-bw-primary'
                    : 'border-transparent text-bw-mid hover:text-bw-text'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'positionen' ? (
              <div className="space-y-4">
                {pos.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-bw-border bg-bw-card p-3 text-sm shadow-card"
                  >
                    <p className="font-semibold text-bw-text">{p.gewerk_name || 'Gewerk'}</p>
                    <p className="text-bw-text-muted">{p.leistung_name ?? p.leistung}</p>
                    {p.handwerker_name ? (
                      <p className="mt-1 text-xs text-bw-mid">Handwerker: {p.handwerker_name}</p>
                    ) : null}
                    <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <dt className="text-bw-mid">Lohn</dt>
                      <dd>{betragAnzeige(null, p.lohn_netto * p.menge, p.lohn_netto * p.menge)}</dd>
                      <dt className="text-bw-mid">Material</dt>
                      <dd>
                        {betragAnzeige(null, p.material_netto * p.menge, p.material_netto * p.menge)}
                      </dd>
                      <dt className="text-bw-mid">Gesamt</dt>
                      <dd className="font-medium">
                        {betragAnzeige(null, p.gesamt_min, p.gesamt_max)}
                      </dd>
                    </dl>
                  </div>
                ))}
                <div className="rounded-lg border border-bw-border bg-bw-bg p-3 text-sm">
                  <p className="text-bw-mid">Netto</p>
                  <p className="font-medium">{betragAnzeige(null, summen.nettoMin, summen.nettoMax)}</p>
                  <p className="mt-2 text-bw-mid">MwSt ({summen.mwstSatz}%)</p>
                  <p>{betragAnzeige(null, summen.mwstBetragMin, summen.mwstBetragMax)}</p>
                  <p className="mt-2 text-bw-mid">Brutto</p>
                  <p className="font-semibold">{betragAnzeige(null, bruttoMin, bruttoMax)}</p>
                </div>
              </div>
            ) : null}

            {tab === 'versand' && detail ? (
              <AngebotVersandSection
                detail={detail}
                bruttoMin={bruttoMin}
                bruttoMax={bruttoMax}
                positionen={pos}
                gueltigBis={gueltigBis}
              />
            ) : null}

            {tab === 'versand' && !detail ? (
              <p className="text-sm text-bw-text-muted">
                Versand-Optionen stehen nach dem Laden der vollständigen Daten zur Verfügung.
              </p>
            ) : null}

            {tab === 'notizen' ? (
              <div className="space-y-3">
                <Textarea
                  label="Interne Notizen"
                  value={notizen}
                  onChange={(e) => setNotizen(e.target.value)}
                  rows={8}
                  placeholder="Interne Notizen…"
                />
                <Button type="button" onClick={saveNotizen} disabled={pending || !angebotId}>
                  {pending ? 'Speichern…' : 'Speichern'}
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </SidePanel>
  )
}

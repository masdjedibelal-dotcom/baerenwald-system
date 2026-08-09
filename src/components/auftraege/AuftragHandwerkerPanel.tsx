'use client'

import { useMemo, useState, useTransition } from 'react'
import { FileText, UserPlus } from 'lucide-react'
import { resolveMockIcon } from '@/lib/mock-icons'
import { HandwerkerDetailsModal } from '@/components/auftraege/HandwerkerDetailsModal'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import {
  updateAuftragHandwerkerStatus,
  updateAuftragPositionHandwerkerStatus } from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  HandwerkerZuweisenModal,
  type HandwerkerZuweisenKontext,
  type HandwerkerZuweisenScope } from '@/components/auftraege/HandwerkerZuweisenModal'
import {
  HandwerkerZuweisungMailModal,
  type HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  auftragHwStatusBadgeClass,
  auftragHwStatusLabel,
  type AuftragHandwerkerZuweisungStatus } from '@/lib/auftraege/auftrag-handwerker-status'
import { cn } from '@/lib/utils'
import { labelHandwerkerAblehnung } from '@/lib/angebote/ablehnung-labels'
import type { AngebotHandwerkerRow, AuftragHandwerkerRow, AuftragPosition } from '@/lib/types'

type GewerkOpt = { id: string; name: string; slug: string }


const ToolIcon = resolveMockIcon('tool')

function zuweisungFuerGewerk(
  rows: AuftragHandwerkerRow[],
  gewerkId: string
): AuftragHandwerkerRow | null {
  const fuerGewerk = rows.filter((z) => z.gewerk_id === gewerkId)
  return (
    fuerGewerk.find((z) => (z.status ?? '').toLowerCase() !== 'ersetzt') ??
    fuerGewerk.find((z) => (z.status ?? '').toLowerCase() === 'abgelehnt') ??
    fuerGewerk[0] ??
    null
  )
}
function ablehnungGrundAusAngebot(
  z: AuftragHandwerkerRow,
  angebotHandwerker?: AngebotHandwerkerRow[]
): string | null {
  if (!angebotHandwerker?.length) return null
  const row = angebotHandwerker.find(
    (a) =>
      a.handwerker_id === z.handwerker_id &&
      (a.gewerk_id === z.gewerk_id || !z.gewerk_id) &&
      (a.status ?? '').toLowerCase() === 'abgelehnt'
  )
  return row?.ablehnung_grund ?? null
}

type GewerkGruppe = {
  gewerkId: string
  gewerkName: string
  gewerkSlug: string | null
  zuweisung: AuftragHandwerkerRow | null
  positionen: AuftragPosition[]
}
export function AuftragHandwerkerPanel({
  auftragId,
  positionen,
  handwerkerRows,
  gewerke,
  kontext,
  angebotHandwerker = [],
  projektName,
  onChanged }: {
  auftragId: string
  positionen: AuftragPosition[]
  handwerkerRows: AuftragHandwerkerRow[]
  gewerke: GewerkOpt[]
  kontext: HandwerkerZuweisenKontext
  angebotHandwerker?: AngebotHandwerkerRow[]
  projektName?: string
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [modalScope, setModalScope] = useState<HandwerkerZuweisenScope | null>(null)
  const [hwMailModal, setHwMailModal] = useState<HandwerkerZuweisungMailTarget | null>(null)
  const [detailsOpen, setDetailsOpen] = useState<
    | { mode: 'gewerk'; zuweisung: AuftragHandwerkerRow }
    | { mode: 'position'; position: AuftragPosition }
    | null
  >(null)

  const gruppen = useMemo((): GewerkGruppe[] => {
    const byGewerk = new Map<string, GewerkGruppe>()

    for (const g of gewerke) {
      byGewerk.set(g.id, {
        gewerkId: g.id,
        gewerkName: g.name,
        gewerkSlug: g.slug,
        zuweisung: zuweisungFuerGewerk(handwerkerRows, g.id),
        positionen: [] })
    }

    for (const p of positionen) {
      const g =
        gewerke.find((x) => x.slug === p.gewerk_slug) ??
        gewerke.find((x) => x.name === p.gewerk_name)
      const key = g?.id ?? `name:${p.gewerk_name}`
      if (!byGewerk.has(key)) {
        byGewerk.set(key, {
          gewerkId: g?.id ?? '',
          gewerkName: p.gewerk_name,
          gewerkSlug: p.gewerk_slug ?? g?.slug ?? null,
          zuweisung: g ? zuweisungFuerGewerk(handwerkerRows, g.id) : null,
          positionen: [] })
      }
      byGewerk.get(key)!.positionen.push(p)
    }

    for (const z of handwerkerRows) {
      if (!byGewerk.has(z.gewerk_id)) {
        byGewerk.set(z.gewerk_id, {
          gewerkId: z.gewerk_id,
          gewerkName: z.gewerke?.name ?? 'Gewerk',
          gewerkSlug: z.gewerke?.slug ?? null,
          zuweisung: z,
          positionen: [] })
      }
    }

    return Array.from(byGewerk.values()).filter((g) => g.gewerkId || g.positionen.length > 0)
  }, [positionen, handwerkerRows, gewerke])

  function openGewerkModal(gruppe: GewerkGruppe, replaceZuweisungId?: string) {
    if (!gruppe.gewerkId) {
      toast.error('Gewerk nicht in Stammdaten — bitte Position mit gültigem Gewerk anlegen.')
      return
    }
    setModalScope({
      type: 'gewerk',
      gewerkId: gruppe.gewerkId,
      gewerkName: gruppe.gewerkName,
      gewerkSlug: gruppe.gewerkSlug,
      positionIds: gruppe.positionen.map((p) => p.id),
      leistungen: gruppe.positionen.map((p) => {
        const qty =
          p.einheit && p.einheit !== 'pauschal' ? `${p.menge ?? 1} ${p.einheit}` : 'Pauschal'
        return `${p.leistung_name}${p.beschreibung ? ` — ${p.beschreibung}` : ''} (${qty})`
      }),
      replaceZuweisungId })
  }

  function openPositionModal(gruppe: GewerkGruppe, position: AuftragPosition) {
    if (!gruppe.gewerkId) {
      toast.error('Gewerk nicht in Stammdaten.')
      return
    }
    setModalScope({
      type: 'position',
      position,
      gewerkId: gruppe.gewerkId,
      gewerkName: gruppe.gewerkName })
  }

  function changeGewerkStatus(zuweisungId: string, status: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragHandwerkerStatus({ auftragId, zuweisungId, status })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Status aktualisiert')
        onChanged()
      }
    })
  }

  function changePositionStatus(positionId: string, status: AuftragHandwerkerZuweisungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionHandwerkerStatus({ auftragId, positionId, status })
      if (!r.ok) toast.error(r.message)
      else {
        toast.success('Status aktualisiert')
        onChanged()
      }
    })
  }

  if (gruppen.length === 0) {
    return (
      <div className="mb-6 rounded-lg border border-bw-border bg-bw-card p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-bw-text">
          <ToolIcon className="h-4 w-4 text-bw-primary" aria-hidden />
          Handwerker
        </h3>
        <p className="text-sm text-bw-text-muted">
          Noch keine Gewerke oder Positionen — zuerst Leistungen anlegen, dann Handwerker zuweisen.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-bw-border bg-bw-card p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-bw-text">
          <ToolIcon className="h-4 w-4 text-bw-primary" aria-hidden />
          Handwerker zuweisen
        </h3>
        <p className="mb-4 text-xs text-bw-text-muted">
          Pro Gewerk oder einzelne Leistung — Nachricht mit Ort, Zeitraum und Leistungen wird automatisch befüllt.
        </p>

        <div className="space-y-4">
          {gruppen.map((gruppe) => {
            const z = gruppe.zuweisung
            const hwName = z?.handwerker?.name ?? null
            const hwStatus = z?.status ?? 'ausstehend'
            const abgelehnt = (hwStatus as string).toLowerCase() === 'abgelehnt'
            const ablehnungGrund = z && abgelehnt ? ablehnungGrundAusAngebot(z, angebotHandwerker) : null
            return (
              <div key={gruppe.gewerkId || gruppe.gewerkName} className="rounded-lg border border-bw-border p-3">
                {abgelehnt && z ? (
                  <div className="mb-3 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-sm">
                    <p className="font-medium text-danger">
                      Partner {hwName ?? '—'} hat abgelehnt
                      {ablehnungGrund ? `: ${labelHandwerkerAblehnung(ablehnungGrund)}` : ''}
                    </p>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="mt-2"
                      disabled={pending || !gruppe.gewerkId}
                      onClick={() => openGewerkModal(gruppe, z.id)}
                    >
                      <UserPlus className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                      Anderen Partner zuweisen
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-bw-text">{gruppe.gewerkName}</p>
                    <p className="mt-0.5 text-sm text-bw-text-muted">
                      {hwName ? (
                        <>
                          {hwName}
                          {z?.handwerker?.telefon ? (
                            <>
                              {' · '}
                              <a href={`tel:${z.handwerker.telefon}`} className="text-bw-link underline">
                                {z.handwerker.telefon}
                              </a>
                            </>
                          ) : null}
                        </>
                      ) : (
                        'Noch kein Handwerker fürs Gewerk'
                      )}
                    </p>
                    {z ? (
                      <span
                        className={cn(
                          'mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          auftragHwStatusBadgeClass(hwStatus)
                        )}
                      >
                        {auftragHwStatusLabel(hwStatus)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {z ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setDetailsOpen({ mode: 'gewerk', zuweisung: z })}
                        >
                          <FileText className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                          Details
                        </Button>
                        <Select
                          name={`status-gw-${z.id}`}
                          value={(hwStatus as AuftragHandwerkerZuweisungStatus) || 'ausstehend'}
                          onChange={(e) =>
                            changeGewerkStatus(z.id, e.target.value as AuftragHandwerkerZuweisungStatus)
                          }
                          options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                          className="!min-w-[160px]"
                          disabled={pending}
                        />
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!gruppe.gewerkId || pending}
                      onClick={() => openGewerkModal(gruppe)}
                    >
                      <UserPlus className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                      {hwName ? 'Gewerk ändern' : 'Gewerk zuweisen'}
                    </Button>
                  </div>
                </div>

                {gruppe.positionen.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-bw-border pt-3">
                    {gruppe.positionen.map((p) => {
                      const posStatus = p.handwerker_status ?? (p.handwerker_id ? 'zugewiesen' : 'ausstehend')
                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-2 rounded-md bg-bw-hover/50 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-bw-text">{p.leistung_name}</p>
                            <p className="text-xs text-bw-text-muted">
                              {p.handwerker?.name ?? 'Kein Handwerker'}
                              {' · '}
                              <span
                                className={cn(
                                  'inline rounded px-1.5 py-0.5 text-[11px] font-medium',
                                  auftragHwStatusBadgeClass(posStatus)
                                )}
                              >
                                {auftragHwStatusLabel(posStatus)}
                              </span>
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {p.handwerker_id ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() => setDetailsOpen({ mode: 'position', position: p })}
                                >
                                  <FileText className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                                  Details
                                </Button>
                                <Select
                                  name={`status-pos-${p.id}`}
                                  value={(posStatus as AuftragHandwerkerZuweisungStatus) || 'ausstehend'}
                                  onChange={(e) =>
                                    changePositionStatus(p.id, e.target.value as AuftragHandwerkerZuweisungStatus)
                                  }
                                  options={AUFTRAG_HW_STATUS_OPTIONS.map((o) => ({
                                    value: o.value,
                                    label: o.label }))}
                                  className="!min-w-[140px]"
                                  disabled={pending}
                                />
                              </>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={!gruppe.gewerkId || pending}
                              onClick={() => openPositionModal(gruppe, p)}
                            >
                              {p.handwerker_id ? 'Ändern' : 'Zuweisen'}
                            </Button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <HandwerkerZuweisenModal
        open={!!modalScope}
        onClose={() => setModalScope(null)}
        auftragId={auftragId}
        kontext={kontext}
        scope={modalScope}
        projektName={projektName}
        onDone={onChanged}
        onMailOpen={(mail) => setHwMailModal(mail)}
      />

      <HandwerkerZuweisungMailModal
        open={!!hwMailModal}
        onClose={() => setHwMailModal(null)}
        auftragId={auftragId}
        target={hwMailModal}
        onSent={onChanged}
      />

      <HandwerkerDetailsModal
        open={!!detailsOpen}
        onClose={() => setDetailsOpen(null)}
        auftragId={auftragId}
        mode={detailsOpen?.mode ?? 'gewerk'}
        zuweisung={detailsOpen?.mode === 'gewerk' ? detailsOpen.zuweisung : null}
        position={detailsOpen?.mode === 'position' ? detailsOpen.position : null}
        onSaved={onChanged}
      />
    </>
  )
}

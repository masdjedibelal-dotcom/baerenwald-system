'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn, MockEmpty } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'
import { Combobox } from '@/components/ui/Combobox'
import { useEffect, useMemo, useState } from 'react'
import { resolveMockIcon } from '@/lib/mock-icons'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import {
  Ustg13bHilfeSheet,
  Ustg13bHilfeTrigger,
} from '@/components/rechnungen/Ustg13bHilfeSheet'
import { Accordion } from '@/components/ui/Accordion'
import { toast } from '@/components/ui/app-toast'
import {
  assignAuftragHandwerkerGewerk,
  assignAuftragHandwerkerPosition,
  listHandwerkerAuswahlFuerGewerk,
  replaceAuftragHandwerkerUndSenden } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'
import {
  AUFTRAG_HW_STATUS_OPTIONS,
  type AuftragHandwerkerZuweisungStatus } from '@/lib/auftraege/auftrag-handwerker-status'
import { cn, formatDatum } from '@/lib/utils'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import type { AuftragPosition } from '@/lib/types'
import { formatEuro } from '@/lib/format/geld-datum'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

const ToolIcon = resolveMockIcon('tool')

export type HandwerkerZuweisenKontext = {
  kundeName: string
  adresse?: string | null
  plz?: string | null
  ort?: string | null
  startDatum?: string | null
  endDatum?: string | null
  notizen?: string | null
}

export type HandwerkerReplacePosition = {
  id: string
  leistung_name: string
  leistung_status?: string | null
  erledigt_am?: string | null
  preis_partner?: number | null
  lohn_fix?: number | null
  material_fix?: number | null
  handwerker_id?: string | null
}

export type HandwerkerZuweisenScope =
  | {
      type: 'gewerk'
      gewerkId: string
      gewerkName: string
      gewerkSlug?: string | null
      positionIds?: string[]
      leistungen: string[]
      /** Bestehende Zuweisung ersetzen (bearbeiten / nach Ablehnung) */
      replaceZuweisungId?: string
      replacePositionen?: HandwerkerReplacePosition[]
    }
  | {
      type: 'position'
      position: AuftragPosition
      gewerkId: string
      gewerkName: string
      gewerkSlug?: string | null
      replaceZuweisungId?: string
      replacePositionen?: HandwerkerReplacePosition[]
    }

type SplitZiel = 'alt' | 'neu'

function positionIstErledigt(p: HandwerkerReplacePosition): boolean {
  const st = String(p.leistung_status ?? '').toLowerCase()
  return st === 'erledigt' || Boolean(p.erledigt_am)
}

function defaultPartnerBetrag(p: HandwerkerReplacePosition): number {
  if (p.preis_partner != null && Number.isFinite(Number(p.preis_partner))) {
    return Number(p.preis_partner)
  }
  const lohn = Number(p.lohn_fix ?? 0) || 0
  const mat = Number(p.material_fix ?? 0) || 0
  return lohn + mat
}

function parseEurInput(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function HandwerkerPickRow({
  h,
  selected,
  disabled,
  onSelect }: {
  h: HandwerkerGewerkListeEintrag
  selected: boolean
  disabled?: boolean
  onSelect: () => void
}) {
  return (
    <label className="flex cursor-pointer gap-3.5 rounded-field border border-bw-border-strong p-4 min-h-[76px] items-center hover:bg-bw-hover">
      <input
        type="radio"
        name="hw-pick"
        className="mt-0.5 shrink-0"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
      />
      <div className="min-w-0 flex-1 text-[length:var(--fs-text)]">
        <p className="break-words font-semibold text-[length:var(--fs-title)] leading-snug text-bw-text whitespace-normal">
          {h.name}
          {h.firma ? <span className="font-medium text-bw-text-muted"> · {h.firma}</span> : null}
        </p>
        {h.telefon ? (
          <a href={`tel:${h.telefon.replace(/\s/g, '')}`} className="mt-1 inline-block text-[length:var(--fs-meta)] text-bw-link underline">
            {h.telefon}
          </a>
        ) : null}
      </div>
    </label>
  )
}

export function HandwerkerZuweisenModal({
  open,
  onClose,
  auftragId,
  kontext,
  scope,
  projektName,
  onDone,
  onMailOpen,
}: {
  open: boolean
  onClose: () => void
  auftragId: string
  kontext: HandwerkerZuweisenKontext
  scope: HandwerkerZuweisenScope | null
  projektName?: string
  onDone: () => void
  onMailOpen: (mail: HandwerkerZuweisungMailTarget) => void
}) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<AuftragHandwerkerZuweisungStatus>('angefragt')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [empfohlen, setEmpfohlen] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [alle, setAlle] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listErr, setListErr] = useState<string | null>(null)
  const [splitZiel, setSplitZiel] = useState<Record<string, SplitZiel>>({})
  const [betragAlt, setBetragAlt] = useState<Record<string, string>>({})
  const [hwRechnungReverseCharge13b, setHwRechnungReverseCharge13b] = useState(false)
  const [ustg13bHilfeOpen, setUstg13bHilfeOpen] = useState(false)

  const gewerkId = scope?.gewerkId ?? ''
  const gewerkSlug = scope?.gewerkSlug ?? null
  const gewerkName = scope?.gewerkName ?? 'Gewerk'
  const scopeLeistungenCount =
    scope?.type === 'gewerk' ? scope.leistungen.length : scope?.type === 'position' ? 1 : 0
  const isReplace = Boolean(scope?.replaceZuweisungId)

  const replacePositionen = useMemo((): HandwerkerReplacePosition[] => {
    if (!scope?.replaceZuweisungId) return []
    if (scope.replacePositionen?.length) return scope.replacePositionen
    if (scope.type === 'position') {
      const p = scope.position
      return [
        {
          id: p.id,
          leistung_name: p.leistung_name,
          leistung_status: p.leistung_status,
          erledigt_am: p.erledigt_am,
          preis_partner: p.preis_partner,
          lohn_fix: p.lohn_fix,
          material_fix: p.material_fix,
          handwerker_id: p.handwerker_id,
        },
      ]
    }
    return []
  }, [scope])

  useEffect(() => {
    if (!open || !scope) return
    setSelectedId(null)
    setStatus('angefragt')
    setListErr(null)
    setEmpfohlen([])
    setAlle([])
    setLoadingList(true)
    setHwRechnungReverseCharge13b(false)

    const nextZiel: Record<string, SplitZiel> = {}
    const nextBetrag: Record<string, string> = {}
    for (const p of replacePositionen) {
      nextZiel[p.id] = positionIstErledigt(p) ? 'alt' : 'neu'
      nextBetrag[p.id] = formatEuro(defaultPartnerBetrag(p), { suffix: false })
    }
    setSplitZiel(nextZiel)
    setBetragAlt(nextBetrag)

    void (async () => {
      const r = await listHandwerkerAuswahlFuerGewerk({
        gewerkId: gewerkId || null,
        gewerkSlug })
      if (!r.ok) {
        setListErr(r.message)
      } else {
        setEmpfohlen(r.empfohlen)
        setAlle(r.alle)
      }
      setLoadingList(false)
    })()
  }, [open, scope, gewerkId, gewerkSlug, replacePositionen])

  const selectedHw = useMemo(() => {
    if (!selectedId) return null
    return empfohlen.find((h) => h.id === selectedId) ?? alle.find((h) => h.id === selectedId) ?? null
  }, [selectedId, empfohlen, alle])

  const splitSummary = useMemo(() => {
    if (!isReplace || !replacePositionen.length) return null
    let altN = 0
    let neuN = 0
    let altSum = 0
    for (const p of replacePositionen) {
      const ziel = splitZiel[p.id] ?? 'neu'
      if (ziel === 'alt') {
        altN++
        altSum += parseEurInput(betragAlt[p.id] ?? '') ?? defaultPartnerBetrag(p)
      } else {
        neuN++
      }
    }
    return { altN, neuN, altSum }
  }, [isReplace, replacePositionen, splitZiel, betragAlt])

  function zuweisen() {
    if (!scope || !selectedId) {
      applyFieldErrors({ _form: TOAST.bitte_partner_auswaehlen })
      return
    }
    if (isReplace && replacePositionen.length > 0 && (splitSummary?.neuN ?? 0) === 0) {
      applyFieldErrors({ _form: 'Bitte mindestens eine Position dem neuen Partner zuordnen.' })
      return
    }
    const hwName = selectedHw?.name ?? 'Partner'
    const replaceId = scope.replaceZuweisungId?.trim()
    startTransition(async () => {
      if (replaceId) {
        const positionMoves =
          replacePositionen.length > 0
            ? replacePositionen.map((p) => {
                const ziel = splitZiel[p.id] ?? 'neu'
                const preis =
                  ziel === 'alt'
                    ? parseEurInput(betragAlt[p.id] ?? '') ?? defaultPartnerBetrag(p)
                    : null
                return {
                  positionId: p.id,
                  ziel,
                  preisPartner: preis,
                }
              })
            : undefined
        if (positionMoves && !positionMoves.some((m) => m.ziel === 'neu')) {
          toast.error(TOAST.mindestens_eine_leistung_dem_neuen_partner_zuwei)
          return
        }
        const r = await replaceAuftragHandwerkerUndSenden({
          auftragId,
          alteZuweisungId: replaceId,
          neuerHandwerkerId: selectedId,
          projektName,
          positionMoves,
        })
        if (!r.ok) {
          toast.systemError(r)
          return
        }
        const altN = positionMoves?.filter((m) => m.ziel === 'alt').length ?? 0
        const neuN = positionMoves?.filter((m) => m.ziel === 'neu').length ?? replacePositionen.length
        toast.success(
          altN > 0
            ? `Partner gewechselt — ${neuN} neu, ${altN} beim Alten`
            : 'Partner gewechselt — Anfrage gesendet'
        )
        onDone()
        onClose()
        return
      }

      const r =
        scope.type === 'position'
          ? await assignAuftragHandwerkerPosition({
              auftragId: scope.position.auftrag_id?.trim() || auftragId,
              positionId: scope.position.id,
              handwerkerId: selectedId,
              status,
              hwRechnungReverseCharge13b,
            })
          : await assignAuftragHandwerkerGewerk({
              auftragId,
              gewerkId: scope.gewerkId,
              handwerkerId: selectedId,
              positionIds: scope.positionIds,
              status,
              hwRechnungReverseCharge13b,
            })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.partner_zugewiesen)
      onMailOpen({
        handwerkerId: selectedId,
        handwerkerName: hwName,
        gewerkName,
        positionId: scope.type === 'position' ? scope.position.id : undefined,
        positionIds: scope.type === 'gewerk' ? scope.positionIds : undefined })
      onDone()
      onClose()
    })
  }

  const title = isReplace
    ? scope?.type === 'position'
      ? `Partner bearbeiten — ${scope.position.leistung_name}`
      : `Partner bearbeiten — ${gewerkName}`
    : scope?.type === 'position'
      ? `Partner zuweisen — ${scope.position.leistung_name}`
      : scopeLeistungenCount > 1
        ? `Partner zuweisen — ${scopeLeistungenCount} Leistungen (${gewerkName})`
        : `Partner zuweisen — ${gewerkName}`

  const leistungenPreview =
    scope?.type === 'gewerk' && scope.leistungen.length > 0 && !isReplace ? (
      <div className="mb-4 rounded-card border border-bw-border bg-bw-bg-soft/50 p-4">
        <p className="mb-2 text-[length:var(--fs-meta)] font-semibold uppercase tracking-wide text-bw-text-muted">
          {scope.leistungen.length === 1 ? 'Leistung in der Anfrage' : `${scope.leistungen.length} Leistungen in einer Anfrage`}
        </p>
        <ul className="space-y-1.5 text-[length:var(--fs-text)] text-bw-text">
          {scope.leistungen.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-semibold text-bw-primary">{i + 1}.</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </div>
    ) : null

  const splitPanel =
    isReplace && replacePositionen.length > 0 ? (
      <div className="mb-4 space-y-3">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          Leistungen aufteilen — erledigte bleiben standardmäßig beim Alten, Betrag anpassbar.
        </p>
        <ul className="m-0 list-none space-y-2 p-0">
          {replacePositionen.map((p) => {
            const ziel = splitZiel[p.id] ?? 'neu'
            return (
              <li key={p.id} className="rounded-card border border-bw-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[length:var(--fs-text)] font-medium text-bw-text">
                      {p.leistung_name}
                    </p>
                    <p className="mt-0.5 text-[length:var(--fs-meta)] text-bw-text-muted">
                      {positionIstErledigt(p) ? 'Erledigt' : 'Offen'}
                    </p>
                  </div>
                  <div className="segment-toggle" role="group" aria-label="Zuordnung">
                    <MockBtn className={cn(
                        'segment-toggle-btn',
                        ziel === 'alt' && 'segment-toggle-btn--active'
                      )} type="button" onClick={() => setSplitZiel((s) => ({ ...s, [p.id]: 'alt' }))} disabled={pending}>
                      Beim Alten
                    </MockBtn>
                    <MockBtn className={cn(
                        'segment-toggle-btn',
                        ziel === 'neu' && 'segment-toggle-btn--active'
                      )} type="button" onClick={() => setSplitZiel((s) => ({ ...s, [p.id]: 'neu' }))} disabled={pending}>
                      An neuen
                    </MockBtn>
                  </div>
                </div>
                {ziel === 'alt' ? (
                  <label className="mt-2 block text-[length:var(--fs-meta)] text-bw-text-muted">
                    Betrag beim Alten (€)
                    <MockInput type="text" inputMode="decimal" className="mt-1 w-full rounded-field border border-bw-border bg-surface px-2 py-1.5 text-[length:var(--fs-text)] text-bw-text tabular-nums" value={betragAlt[p.id] ?? ''} onChange={(e) =>
                        setBetragAlt((b) => ({ ...b, [p.id]: e.target.value }))} disabled={pending} />
                  </label>
                ) : null}
              </li>
            )
          })}
        </ul>
        {splitSummary ? (
          <p className="text-[length:var(--fs-meta)] text-bw-text-muted">
            {splitSummary.altN > 0
              ? `${splitSummary.altN} Leistung${splitSummary.altN === 1 ? '' : 'en'} bleiben beim Alten (${formatEuro(splitSummary.altSum)})`
              : 'Beim Alten bleibt keine Leistung'}
            {' · '}
            {splitSummary.neuN > 0
              ? `${splitSummary.neuN} gehen an den neuen Partner — neu anfragen`
              : 'Neuer Partner ohne Leistung'}
          </p>
        ) : null}
      </div>
    ) : null

  const body = (
    <>
      <p className="mb-3 text-[length:var(--fs-text)] text-bw-text-muted">
        {isReplace
          ? 'Ersatz wählen — Anfrage geht ans Portal. Erledigte Leistungen können beim Alten bleiben.'
          : scope?.type === 'position'
            ? 'Partner für diese Leistung wählen.'
            : scopeLeistungenCount > 1
              ? `${scopeLeistungenCount} Leistungen · ein Partner.`
              : `Partner für „${gewerkName}“ wählen.`}
      </p>
      {!isReplace && (
        <MockField label="Status nach Zuweisung">
          <MockSelect name="hw-status" id="hw-status" value={status} onChange={(e) => setStatus(e.target.value as AuftragHandwerkerZuweisungStatus)} className="mb-4">
            {AUFTRAG_HW_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </MockSelect>
        </MockField>
      )}
      {!isReplace && (
        <label className="mb-4 flex cursor-pointer items-start gap-2 rounded-card border border-bw-border bg-bw-hover/30 px-3 py-2.5 text-[length:var(--fs-text)]">
          <MockCheckbox
            className="mt-0.5"
            checked={hwRechnungReverseCharge13b}
            onChange={(e) => setHwRechnungReverseCharge13b(e.target.checked)}
          />
          <span>
            <span className="inline-flex items-center font-medium">
              EK: § 13b UStG für Partner-Rechnung
              <Ustg13bHilfeTrigger onOpen={() => setUstg13bHilfeOpen(true)} />
            </span>
            <span className="mt-0.5 block text-[length:var(--fs-meta)] text-bw-text-muted">
              Steuert den Reverse-Charge-Hinweis auf der automatischen
              Eingangsrechnung.
            </span>
          </span>
        </label>
      )}
      {leistungenPreview}
      {splitPanel}
      {(kontext.startDatum || kontext.endDatum) && (
        <p className="mb-3 text-[length:var(--fs-meta)] text-bw-text-muted">
          Zeitraum: {kontext.startDatum ? formatDatum(kontext.startDatum) : '—'}
          {' – '}
          {kontext.endDatum ? formatDatum(kontext.endDatum) : '—'}
          {' · '}
          {kontext.kundeName}
        </p>
      )}
      {listErr ? <p className="mb-2 text-[length:var(--fs-text)] text-danger">{listErr}</p> : null}
      {loadingList ? (
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">Partner werden geladen…</p>
      ) : empfohlen.length === 0 && alle.length === 0 ? (
        <MockEmpty title="Keine aktiven Partner gefunden." />
      ) : (
        <div className="max-h-[50vh] space-y-2 overflow-y-auto">
          <Accordion
            title={`Empfohlen${empfohlen.length ? ` · ${empfohlen.length}` : ''}`}
            defaultOpen
            className="hw-pick-accordion"
          >
            {empfohlen.length === 0 ? (
              <p className="text-[length:var(--fs-text)] text-bw-text-muted">
                Keine Partner mit diesem Gewerk in den Stammdaten — alle Partner unten.
              </p>
            ) : (
              <ul className="space-y-2">
                {empfohlen.map((h) => (
                  <li key={h.id}>
                    <HandwerkerPickRow
                      h={h}
                      selected={selectedId === h.id}
                      disabled={pending}
                      onSelect={() => setSelectedId(h.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Accordion>
          <Accordion
            title={`Alle Partner${alle.length ? ` · ${alle.length}` : ''}`}
            defaultOpen={empfohlen.length === 0}
            className="hw-pick-accordion"
          >
            {alle.length === 0 ? (
              <MockEmpty title="Keine weiteren Partner." />
            ) : (
              <ul className="space-y-2">
                {alle.map((h) => (
                  <li key={h.id}>
                    <HandwerkerPickRow
                      h={h}
                      selected={selectedId === h.id}
                      disabled={pending}
                      onSelect={() => setSelectedId(h.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Accordion>
        </div>
      )}
      {selectedHw ? (
        <p className="mt-3 flex items-center gap-2 text-[length:var(--fs-meta)] text-bw-text-muted">
          <ToolIcon className="h-3.5 w-3.5 text-bw-primary" aria-hidden />
          Ausgewählt: <span className="font-medium text-bw-text">{selectedHw.name}</span>
        </p>
      ) : null}
    </>
  )

  return (
    <>
      <EditorSheet
        open={open}
        onClose={onClose}
        title={title}
        context="detail"
        size="lg"
        onConfirm={zuweisen}
        confirmBusy={pending}
        confirmDisabled={pending}
      >
      {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
                {body}
      </EditorSheet>
      <Ustg13bHilfeSheet
        open={ustg13bHilfeOpen}
        onClose={() => setUstg13bHilfeOpen(false)}
        variant="eingang"
      />
    </>
  )
}

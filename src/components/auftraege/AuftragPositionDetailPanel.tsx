'use client'

/**
 * @deprecated Ersetzt durch flache Liste in `leistungen-v3/` (v3). Wird von Legacy-Tab genutzt.
 */
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Star,
  Trash2,
} from 'lucide-react'
import { AuftragPositionPipelineStepper } from '@/components/auftraege/AuftragPositionPipelineStepper'
import { AuftragPositionHandwerkerPanel } from '@/components/auftraege/AuftragPositionHandwerkerPanel'
import {
  HandwerkerKontaktModal,
  type HandwerkerKontaktModalMode,
} from '@/components/auftraege/HandwerkerKontaktModal'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { toast } from '@/components/ui/app-toast'
import {
  assignAuftragHandwerkerPosition,
  listHandwerkerAuswahlFuerGewerk,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  updateAuftragPositionLeistungStatus,
  updateAuftragPositionSteuerung,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import type { AuftragGewerkBlock } from '@/lib/auftraege/auftrag-position-blocks'
import { leistungenLabelsFromPositionen } from '@/lib/auftraege/handwerker-zuweisen-scope'
import {
  LEISTUNG_STATUS_OPTIONS,
  normalizeLeistungStatus,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  buildPositionHandwerkerView,
  margeBarTone,
} from '@/lib/auftraege/position-handwerker-view'
import {
  istEigenleistungPosition,
  preisEigenleistung,
  preisPartner,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import type { HandwerkerNachrichtInput } from '@/lib/auftraege/handwerker-nachricht'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { buildPartnerLoginLink } from '@/lib/portal-utils'
import { betragAnzeige } from '@/lib/angebot-einfach'
import type { AngebotHandwerkerRow, AngebotPosition, AuftragPosition } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/Select'

type LeistungDraft = {
  leistung_name: string
  beschreibung: string
  preis_fix: string
  preis_partner: string
  start_datum: string
  end_datum: string
}

function draftFromPosition(pos: AuftragPosition, partner: number): LeistungDraft {
  return {
    leistung_name: pos.leistung_name ?? '',
    beschreibung: pos.beschreibung ?? '',
    preis_fix: pos.preis_fix != null ? String(pos.preis_fix) : '',
    preis_partner: String(partner > 0 ? partner : (pos.preis_partner ?? '')),
    start_datum: pos.start_datum?.slice(0, 10) ?? '',
    end_datum: pos.end_datum?.slice(0, 10) ?? '',
  }
}

function EuroInput({
  label,
  value,
  onChange,
  onBlur,
  hint,
  readOnly,
}: {
  label: string
  value: string
  onChange?: (v: string) => void
  onBlur?: () => void
  hint?: string
  readOnly?: boolean
}) {
  return (
    <div className="w-full">
      <label className="input-label">{label}</label>
      {readOnly ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] tabular-nums font-medium text-amber-950">
          {value ? `${betragAnzeige(Number(value), null, null)} netto` : '—'}
        </div>
      ) : (
        <div className="txt-prefix">
          <span className="prefix" aria-hidden>
            €
          </span>
          <input
            type="number"
            className="input"
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onBlur={onBlur}
            step="0.01"
            min="0"
          />
        </div>
      )}
      {hint ? <p className="leistung-acc-hint">{hint}</p> : null}
    </div>
  )
}

function HandwerkerPositionSelect({
  auftragId,
  positionId,
  gewerkId,
  gewerkSlug,
  value,
  disabled,
  onChanged,
  onAssigned,
}: {
  auftragId: string
  positionId: string
  gewerkId: string
  gewerkSlug: string | null
  value: string | null
  disabled?: boolean
  onChanged: () => void
  onAssigned?: (handwerkerId: string, handwerkerName: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [options, setOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: '— Eigenleistung —' },
  ])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listHandwerkerAuswahlFuerGewerk({ gewerkId, gewerkSlug }).then((r) => {
      if (cancelled) return
      if (!r.ok) {
        toast.error(r.message)
        setLoading(false)
        return
      }
      const merged = [...r.empfohlen, ...r.alle]
      setOptions([
        { value: '', label: '— Eigenleistung —' },
        ...merged.map((h) => ({
          value: h.id,
          label: h.firma ? `${h.name} · ${h.firma}` : h.name,
        })),
      ])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [gewerkId, gewerkSlug])

  function handleChange(nextId: string) {
    startTransition(async () => {
      if (!nextId) {
        const r = await updateAuftragPositionSteuerung(positionId, auftragId, { handwerker_id: null })
        if (!r.ok) toast.error(r.message)
        else onChanged()
        return
      }
      const r = await assignAuftragHandwerkerPosition({
        auftragId,
        positionId,
        handwerkerId: nextId,
      })
      if (!r.ok) toast.error(r.message)
      else {
        onChanged()
        const label = options.find((o) => o.value === nextId)?.label ?? 'Partner'
        const name = label.includes(' · ') ? label.split(' · ')[0]! : label
        onAssigned?.(nextId, name)
      }
    })
  }

  return (
    <Select
      label="Handwerker"
      value={value ?? ''}
      options={options}
      className="text-sm"
      disabled={disabled || loading || pending}
      onChange={(e) => handleChange(e.target.value)}
    />
  )
}

function MargeLeiste({ vk, marge }: { vk: number; marge: number }) {
  const tone = margeBarTone(marge, vk)
  const pct = vk > 0 ? Math.max(0, Math.min(100, (marge / vk) * 100)) : 0
  const margePct = vk > 0 ? Math.round((marge / vk) * 1000) / 10 : 0

  return (
    <div className="pos-marge-bar">
      <div className="pos-marge-bar__head">
        <span className="pos-marge-bar__label">Marge live</span>
        <span className={cn('pos-marge-bar__value', `pos-marge-bar__value--${tone}`)}>
          {formatEurBetrag(marge)}
          {vk > 0 ? ` (${margePct}%)` : ''}
        </span>
      </div>
      <div className="pos-marge-bar__track" aria-hidden>
        <div
          className={cn('pos-marge-bar__fill', `pos-marge-bar__fill--${tone}`)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="pos-marge-bar__legs">
        <span>EK {formatEurBetrag(vk - marge)}</span>
        <span>VK {formatEurBetrag(vk)}</span>
      </div>
    </div>
  )
}

function LeistungSegmented({
  value,
  disabled,
  onChange,
}: {
  value: AuftragLeistungStatus
  disabled?: boolean
  onChange: (v: AuftragLeistungStatus) => void
}) {
  return (
    <div className="pos-segmented" role="group" aria-label="Baufortschritt">
      {LEISTUNG_STATUS_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          className={cn('pos-segmented__btn', value === o.value && 'pos-segmented__btn--active')}
          disabled={disabled}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function AuftragPositionDetailPanel({
  pos,
  block,
  gewerkId,
  pending,
  handwerkerKontext,
  auftragId,
  auftragAbgeschlossen,
  partnerRow,
  angebotId = null,
  angebotTitel = 'Projekt',
  angebotPositionen = [],
  eigenregie = false,
  defaultTab,
  onSave,
  onMove,
  onDelete,
  onOpenHwMail,
  onBewerteHandwerker,
  onChanged,
}: {
  pos: AuftragPosition
  block: AuftragGewerkBlock
  gewerkId: string
  pending: boolean
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragId: string
  auftragAbgeschlossen: boolean
  partnerRow: AngebotHandwerkerRow | null
  angebotId?: string | null
  angebotTitel?: string
  angebotPositionen?: AngebotPosition[]
  eigenregie?: boolean
  defaultTab?: string
  onSave: (patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: () => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onChanged: () => void
}) {
  const [pendingLocal, startTransition] = useTransition()
  const [kontaktModal, setKontaktModal] = useState<HandwerkerKontaktModalMode | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const prevHwStatus = useRef(partnerRow?.hw_status)

  useEffect(() => {
    const prev = (prevHwStatus.current ?? '').toLowerCase()
    const next = (partnerRow?.hw_status ?? '').toLowerCase()
    if (prev === 'bestaetigt' && next === 'uebernommen') {
      toast.success('Partner hat bestätigt — Konditionen übernommen.')
    }
    prevHwStatus.current = partnerRow?.hw_status
  }, [partnerRow?.hw_status])

  const view = useMemo(
    () => buildPositionHandwerkerView(pos, partnerRow, angebotPositionen),
    [pos, partnerRow, angebotPositionen]
  )

  const partner = preisPartner(pos)
  const eigen = preisEigenleistung(pos)
  const eigenleistung = istEigenleistungPosition(pos)
  const hw = pos.handwerker
  const leistungStatus = normalizeLeistungStatus(pos.leistung_status)

  const [draft, setDraft] = useState(() => draftFromPosition(pos, partner))

  useEffect(() => {
    setDraft(draftFromPosition(pos, partner))
  }, [
    pos.id,
    pos.leistung_name,
    pos.beschreibung,
    pos.preis_fix,
    pos.preis_partner,
    pos.start_datum,
    pos.end_datum,
    partner,
  ])

  const liveVk = draft.preis_fix.trim() ? Number(draft.preis_fix) : 0
  const livePartner = view.konditionenAusstehend
    ? (view.partnerPreisReadOnly ?? 0)
    : draft.preis_partner.trim()
      ? Number(draft.preis_partner)
      : partner
  const liveMarge = (Number.isFinite(liveVk) ? liveVk : 0) - livePartner - eigen

  function commitDraft(patch: Partial<LeistungDraft>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    const serverPatch: Parameters<typeof updateAuftragPositionSteuerung>[2] = {}
    if (patch.leistung_name !== undefined) {
      const name = next.leistung_name.trim()
      if (!name) {
        toast.error('Leistungsname darf nicht leer sein.')
        return
      }
      if (name !== pos.leistung_name) serverPatch.leistung_name = name
    }
    if (patch.beschreibung !== undefined) {
      const text = next.beschreibung.trim() || null
      if (text !== (pos.beschreibung?.trim() || null)) serverPatch.beschreibung = text
    }
    if (patch.preis_fix !== undefined) {
      const n = next.preis_fix.trim() ? Number(next.preis_fix) : null
      if (n !== pos.preis_fix) serverPatch.preis_fix = n != null && Number.isFinite(n) ? n : null
    }
    if (patch.preis_partner !== undefined && !view.konditionenAusstehend) {
      const n = next.preis_partner.trim() ? Number(next.preis_partner) : null
      const current = pos.preis_partner ?? (partner > 0 ? partner : null)
      const parsed = n != null && Number.isFinite(n) ? n : null
      if (parsed !== current) serverPatch.preis_partner = parsed
    }
    if (patch.start_datum !== undefined) {
      const d = next.start_datum || null
      const current = pos.start_datum?.slice(0, 10) || null
      if (d !== current) serverPatch.start_datum = d
    }
    if (patch.end_datum !== undefined) {
      const d = next.end_datum || null
      const current = pos.end_datum?.slice(0, 10) || null
      if (d !== current) serverPatch.end_datum = d
    }
    if (Object.keys(serverPatch).length) onSave(serverPatch)
  }

  const nachrichtInput: HandwerkerNachrichtInput = useMemo(() => {
    return {
      handwerkerName: hw?.name ?? '',
      kundeName: handwerkerKontext.kundeName,
      adresse: handwerkerKontext.adresse,
      plz: handwerkerKontext.plz,
      ort: handwerkerKontext.ort,
      gewerkName: block.gewerkName,
      leistungen: leistungenLabelsFromPositionen([pos]),
      startDatum: pos.start_datum ?? handwerkerKontext.startDatum,
      endDatum: pos.end_datum ?? handwerkerKontext.endDatum,
      portalLink: buildPartnerLoginLink(),
    }
  }, [hw?.name, pos, block.gewerkName, handwerkerKontext])

  function changeLeistungStatus(st: AuftragLeistungStatus) {
    startTransition(async () => {
      const r = await updateAuftragPositionLeistungStatus({
        auftragId,
        positionId: pos.id,
        status: st,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  const tabPreise = (
    <div className="pos-v2-tab-panel space-y-4">
      <div className="leistung-acc-fields">
        <Input
          label="Bezeichnung"
          value={draft.leistung_name}
          onChange={(e) => setDraft((d) => ({ ...d, leistung_name: e.target.value }))}
          onBlur={(e) => commitDraft({ leistung_name: e.target.value })}
          className="field-full"
          placeholder="Leistungsbezeichnung"
          required
        />
        <div className="field-full">
          <Input
            label="Beschreibung"
            value={draft.beschreibung}
            onChange={(e) => setDraft((d) => ({ ...d, beschreibung: e.target.value }))}
            onBlur={(e) => commitDraft({ beschreibung: e.target.value })}
            placeholder="z. B. Bestand komplett entfernen"
          />
        </div>
        <EuroInput
          label="Verkaufspreis (VK)"
          value={draft.preis_fix}
          onChange={(v) => setDraft((d) => ({ ...d, preis_fix: v }))}
          onBlur={() => commitDraft({ preis_fix: draft.preis_fix })}
        />
        {eigenleistung ? (
          <div className="w-full">
            <label className="input-label">EK Eigen (intern)</label>
            <div className="rounded-md border border-bw-border bg-bw-bg px-3 py-2 text-[13px] tabular-nums text-bw-text">
              {eigen > 0 ? formatEurBetrag(eigen) : '—'}
            </div>
          </div>
        ) : view.konditionenAusstehend ? (
          <EuroInput
            label="Preis Partner (Gegenangebot)"
            value={String(view.partnerPreisReadOnly ?? '')}
            readOnly
            hint="Offene Verhandlung — Preis wird nach „Übernehmen“ gesetzt."
          />
        ) : (
          <EuroInput
            label="Preis Partner (vereinbart / intern)"
            value={draft.preis_partner}
            onChange={(v) => setDraft((d) => ({ ...d, preis_partner: v }))}
            onBlur={() => commitDraft({ preis_partner: draft.preis_partner })}
          />
        )}
      </div>
      <MargeLeiste vk={Number.isFinite(liveVk) ? liveVk : 0} marge={liveMarge} />
    </div>
  )

  const tabHandwerker = (
    <div className="pos-v2-tab-panel space-y-4">
      {!eigenregie ? (
        <>
          <AuftragPositionPipelineStepper steps={view.pipeline} />
          <HandwerkerPositionSelect
            auftragId={auftragId}
            positionId={pos.id}
            gewerkId={gewerkId}
            gewerkSlug={block.gewerkSlug}
            value={pos.handwerker_id ?? null}
            disabled={pending || pendingLocal}
            onChanged={onChanged}
            onAssigned={(handwerkerId, handwerkerName) => {
              onOpenHwMail({
                handwerkerId,
                handwerkerName,
                gewerkName: block.gewerkName,
                positionId: pos.id,
              })
            }}
          />
          {pos.handwerker_id && hw ? (
            <div className="pos-v2-icon-bar">
              <button
                type="button"
                className="icon-btn"
                title="WhatsApp"
                aria-label="WhatsApp"
                onClick={() => setKontaktModal('whatsapp')}
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Partner-Mail"
                aria-label="Partner-Mail"
                onClick={() => {
                  const handwerkerId = pos.handwerker_id ?? hw.id
                  if (!handwerkerId) {
                    toast.error('Handwerker-ID fehlt — bitte Seite neu laden.')
                    return
                  }
                  onOpenHwMail({
                    handwerkerId,
                    handwerkerName: hw.name,
                    gewerkName: block.gewerkName,
                    positionId: pos.id,
                  })
                }}
              >
                <Mail className="h-4 w-4" aria-hidden />
              </button>
              {auftragAbgeschlossen && onBewerteHandwerker ? (
                <button
                  type="button"
                  className="icon-btn"
                  title="Handwerker bewerten"
                  aria-label="Handwerker bewerten"
                  onClick={() => {
                    const handwerkerId = pos.handwerker_id ?? hw.id
                    if (!handwerkerId) return
                    onBewerteHandwerker({
                      handwerkerId,
                      name: hw.name,
                      firma: (hw as { firma?: string | null }).firma ?? null,
                      gewerkName: block.gewerkName,
                      gewerkId: gewerkId || null,
                    })
                  }}
                >
                  <Star className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
          {pos.handwerker_id ? (
            <AuftragPositionHandwerkerPanel
              pos={pos}
              partnerRow={partnerRow}
              angebotId={angebotId}
              angebotTitel={angebotTitel}
              angebotPositionen={angebotPositionen}
              auftragId={auftragId}
              onChanged={onChanged}
              layout="embedded"
              advancedOpen={advancedOpen}
              onAdvancedToggle={() => setAdvancedOpen((v) => !v)}
            />
          ) : (
            <p className="text-sm text-bw-text-muted">
              Handwerker zuweisen, um Verhandlung und Gegenvorschlag zu starten.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-bw-text-muted">Eigenregie — keine Handwerker-Koordination.</p>
      )}
    </div>
  )

  const tabTermine = (
    <div className="pos-v2-tab-panel space-y-4">
      <div>
        <p className="input-label mb-2">Baufortschritt</p>
        <LeistungSegmented
          value={leistungStatus}
          disabled={pending || pendingLocal}
          onChange={changeLeistungStatus}
        />
        <p className="mt-2 text-xs text-bw-text-muted">
          Unabhängig vom Verhandlungsstatus — nur Ausführung auf der Baustelle.
        </p>
      </div>
      <div className="leistung-acc-fields">
        <Input
          label="Termin von"
          type="date"
          value={draft.start_datum}
          onChange={(e) => setDraft((d) => ({ ...d, start_datum: e.target.value }))}
          onBlur={(e) => commitDraft({ start_datum: e.target.value })}
        />
        <Input
          label="Termin bis"
          type="date"
          value={draft.end_datum}
          onChange={(e) => setDraft((d) => ({ ...d, end_datum: e.target.value }))}
          onBlur={(e) => commitDraft({ end_datum: e.target.value })}
        />
      </div>
      {pos.absprachen?.trim() || pos.notizen_intern?.trim() ? (
        <div className="rounded-lg border border-bw-border bg-bw-bg/60 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-bw-text-muted">Notizen</p>
          {pos.absprachen?.trim() ? (
            <p className="text-sm text-bw-text whitespace-pre-wrap">{pos.absprachen.trim()}</p>
          ) : null}
          {pos.notizen_intern?.trim() ? (
            <p className="text-sm text-bw-text-muted whitespace-pre-wrap">{pos.notizen_intern.trim()}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-bw-text-muted">Keine Kunden-Notizen für diese Leistung.</p>
      )}
    </div>
  )

  const tabs = eigenregie
    ? [
        { id: 'preise', label: 'Leistung & Preise' },
        { id: 'termine', label: 'Termine & Fortschritt' },
      ]
    : [
        { id: 'preise', label: 'Leistung & Preise' },
        { id: 'handwerker', label: 'Handwerker & Verhandlung' },
        { id: 'termine', label: 'Termine & Fortschritt' },
      ]

  const tabPanels = eigenregie ? [tabPreise, tabTermine] : [tabPreise, tabHandwerker, tabTermine]

  return (
    <>
      <div className="pos-v2-detail">
        <Tabs tabs={tabs} defaultTab={defaultTab ?? (view.konditionenAusstehend ? 'handwerker' : tabs[0]?.id)}>
          {tabPanels}
        </Tabs>
      </div>

      <div className="leistung-acc-foot">
        <button type="button" className="icon-btn" title="Nach oben" onClick={() => onMove(pos.id, -1)}>
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button type="button" className="icon-btn" title="Nach unten" onClick={() => onMove(pos.id, 1)}>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
        <Button type="button" variant="ghost" size="sm" className="text-status-cancel-text" onClick={onDelete}>
          <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
          Löschen
        </Button>
      </div>

      {hw && kontaktModal ? (
        <HandwerkerKontaktModal
          open={!!kontaktModal}
          onClose={() => setKontaktModal(null)}
          mode={kontaktModal}
          handwerkerName={hw.name}
          telefon={hw.telefon}
          email={hw.email}
          nachrichtInput={nachrichtInput}
        />
      ) : null}
    </>
  )
}

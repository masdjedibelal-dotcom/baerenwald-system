'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Star,
  Trash2,
} from 'lucide-react'
import {
  HandwerkerKontaktModal,
  type HandwerkerKontaktModalMode,
} from '@/components/auftraege/HandwerkerKontaktModal'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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
import {
  LEISTUNG_STATUS_OPTIONS,
  leistungStatusBadgeClass,
  leistungStatusLabel,
  normalizeLeistungStatus,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  istEigenleistungPosition,
  preisEigenleistung,
  preisPartner,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import type { HandwerkerNachrichtInput } from '@/lib/auftraege/handwerker-nachricht'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import { buildPartnerLoginLink } from '@/lib/portal-utils'
import type { AuftragPosition } from '@/lib/types'
import { cn, formatPreis } from '@/lib/utils'
import type { HandwerkerZuweisungMailTarget } from '@/components/auftraege/HandwerkerZuweisungMailModal'

function EuroInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <div className="w-full">
      <label className="input-label">{label}</label>
      <div className="txt-prefix">
        <span className="prefix" aria-hidden>
          €
        </span>
        <input
          type="number"
          className="input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
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
}: {
  auftragId: string
  positionId: string
  gewerkId: string
  gewerkSlug: string | null
  value: string | null
  disabled?: boolean
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState<{ value: string; label: string }[]>([
    { value: '', label: '— Eigenleistung —' },
  ])

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
      else onChanged()
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

export function AuftragPositionenLeistungEditPanel({
  pos,
  block,
  gewerkId,
  pending,
  handwerkerKontext,
  auftragId,
  auftragAbgeschlossen,
  onSave,
  onMove,
  onDelete,
  onOpenHwMail,
  onBewerteHandwerker,
  onChanged,
  eigenregie = false,
  showReorder = true,
  showDelete = true,
}: {
  pos: AuftragPosition
  block: AuftragGewerkBlock
  gewerkId: string
  pending: boolean
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragId: string
  auftragAbgeschlossen: boolean
  onSave: (patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: () => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onChanged: () => void
  eigenregie?: boolean
  showReorder?: boolean
  showDelete?: boolean
}) {
  const [pendingLocal, startTransition] = useTransition()
  const [kontaktModal, setKontaktModal] = useState<HandwerkerKontaktModalMode | null>(null)

  const leistungStatus = normalizeLeistungStatus(pos.leistung_status)
  const eigenleistung = istEigenleistungPosition(pos)
  const partner = preisPartner(pos)
  const eigen = preisEigenleistung(pos)
  const marge = (pos.preis_fix ?? 0) - partner - eigen
  const hw = pos.handwerker

  const nachrichtInput: HandwerkerNachrichtInput = useMemo(() => {
    const qty = pos.einheit && pos.einheit !== 'pauschal' ? `${pos.menge ?? 1} ${pos.einheit}` : 'Pauschal'
    return {
      handwerkerName: hw?.name ?? '',
      kundeName: handwerkerKontext.kundeName,
      adresse: handwerkerKontext.adresse,
      plz: handwerkerKontext.plz,
      ort: handwerkerKontext.ort,
      gewerkName: block.gewerkName,
      leistungen: [`${pos.leistung_name} (${qty})`],
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

  return (
    <>
      <div className="leistung-acc-fields">
        <div className="field-full">
          <Select
            label="Status"
            value={leistungStatus}
            options={LEISTUNG_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(e) => changeLeistungStatus(e.target.value as AuftragLeistungStatus)}
            disabled={pending || pendingLocal}
          />
        </div>
        <Input
          label="Leistung"
          value={pos.leistung_name}
          onChange={(e) => onSave({ leistung_name: e.target.value })}
          className="field-full"
          placeholder="Leistungsbezeichnung"
          required
        />
        <div className="field-full">
          <Input
            label="Beschreibung"
            value={pos.beschreibung ?? ''}
            onChange={(e) => onSave({ beschreibung: e.target.value || null })}
            placeholder="z. B. Bestand komplett entfernen"
          />
        </div>
        <EuroInput
          label="Verkaufspreis"
          value={String(pos.preis_fix ?? '')}
          onChange={(v) => onSave({ preis_fix: v ? Number(v) : null })}
        />
        {eigenleistung ? (
          <div className="w-full">
            <label className="input-label">EK Eigen (intern)</label>
            <div className="rounded-md border border-bw-border bg-bw-bg px-3 py-2 text-[13px] tabular-nums text-bw-text">
              {eigen > 0 ? formatEurBetrag(eigen) : '—'}
            </div>
            <p className="leistung-acc-hint">
              Eigenleistung — von uns abgedeckt, keine Fremdleistung / kein Partner-EK.
              {marge !== 0 ? ` Marge: ${formatEurBetrag(marge)}` : ''}
            </p>
          </div>
        ) : (
          <EuroInput
            label="Preis Partner (Fremdleistung)"
            value={String(pos.preis_partner ?? (partner || ''))}
            onChange={(v) => onSave({ preis_partner: v ? Number(v) : null })}
            hint={marge !== 0 ? `Marge: ${formatEurBetrag(marge)}` : undefined}
          />
        )}
        <Input
          label="Von"
          type="date"
          value={pos.start_datum?.slice(0, 10) ?? ''}
          onChange={(e) => onSave({ start_datum: e.target.value || null })}
        />
        <Input
          label="Bis"
          type="date"
          value={pos.end_datum?.slice(0, 10) ?? ''}
          onChange={(e) => onSave({ end_datum: e.target.value || null })}
        />
        <div className="field-full leistung-acc-hw-field">
          {!eigenregie ? (
          <>
          <HandwerkerPositionSelect
            auftragId={auftragId}
            positionId={pos.id}
            gewerkId={gewerkId}
            gewerkSlug={block.gewerkSlug}
            value={pos.handwerker_id ?? null}
            disabled={pending || pendingLocal}
            onChanged={onChanged}
          />
          {hw ? (
            <div className="leistung-acc-hw-actions">
              <button
                type="button"
                className="icon-btn"
                title="WhatsApp"
                aria-label="WhatsApp"
                onClick={() => setKontaktModal('whatsapp')}
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
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
                <Mail className="h-3.5 w-3.5" aria-hidden />
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
                  <Star className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          ) : null}
          </>
          ) : null}
        </div>
      </div>

      {showReorder || showDelete ? (
        <div className="leistung-acc-foot">
          {showReorder ? (
            <>
              <button type="button" className="icon-btn" title="Nach oben" onClick={() => onMove(pos.id, -1)}>
                <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button type="button" className="icon-btn" title="Nach unten" onClick={() => onMove(pos.id, 1)}>
                <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              </button>
            </>
          ) : null}
          {showDelete ? (
            <Button type="button" variant="ghost" size="sm" className="text-status-cancel-text" onClick={onDelete}>
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden />
              Löschen
            </Button>
          ) : null}
        </div>
      ) : null}

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

export function AuftragPositionenLeistungSummaryRow({
  pos,
  onPress,
  showChevron = false,
}: {
  pos: AuftragPosition
  onPress?: () => void
  showChevron?: boolean
}) {
  const leistungStatus = normalizeLeistungStatus(pos.leistung_status)
  const Tag = onPress ? 'button' : 'div'

  return (
    <Tag
      type={onPress ? 'button' : undefined}
      className={cn('pos-mobile-leistung-row', onPress && 'pos-mobile-leistung-row--tappable')}
      onClick={onPress}
    >
      <span className="pos-mobile-leistung-row__name">{pos.leistung_name}</span>
      <span className={cn('leistung-status-badge', leistungStatusBadgeClass(leistungStatus))}>
        {leistungStatusLabel(leistungStatus)}
      </span>
      <span className="pos-mobile-leistung-row__price">{formatPreis(pos.preis_fix ?? null, null, null)}</span>
      {showChevron ? <ChevronDown className="pos-mobile-leistung-row__chevron h-4 w-4 -rotate-90" aria-hidden /> : null}
    </Tag>
  )
}

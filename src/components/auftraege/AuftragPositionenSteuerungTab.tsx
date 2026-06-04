'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  ChevronDown,
  ChevronUp,
  HardHat,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Star,
  Trash2,
} from 'lucide-react'
import { EmptyState } from '@/components/layout/EmptyState'
import {
  HandwerkerKontaktModal,
  type HandwerkerKontaktModalMode,
} from '@/components/auftraege/HandwerkerKontaktModal'
import {
  HandwerkerZuweisungMailModal,
  type HandwerkerZuweisungMailTarget,
} from '@/components/auftraege/HandwerkerZuweisungMailModal'
import { buildPartnerLoginForAuftragUrl } from '@/lib/portal-utils'
import type { HandwerkerZuweisenKontext } from '@/components/auftraege/HandwerkerZuweisenModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { toast } from '@/components/ui/app-toast'
import {
  addAuftragPosition,
  deleteAuftragPosition,
} from '@/app/(dashboard)/auftraege/actions'
import {
  assignAuftragHandwerkerPosition,
  listHandwerkerAuswahlFuerGewerk,
} from '@/app/(dashboard)/auftraege/handwerker-actions'
import {
  reorderAuftragPositionen,
  updateAuftragGewerkBlockMeta,
  updateAuftragPositionLeistungStatus,
  updateAuftragPositionSteuerung,
} from '@/app/(dashboard)/auftraege/positionen-steuerung-actions'
import {
  groupAuftragPositionenByGewerk,
  type AuftragGewerkBlock,
} from '@/lib/auftraege/auftrag-position-blocks'
import {
  LEISTUNG_STATUS_OPTIONS,
  leistungStatusBadgeClass,
  leistungStatusLabel,
  normalizeLeistungStatus,
  type AuftragLeistungStatus,
} from '@/lib/auftraege/auftrag-fortschritt-preis'
import {
  gewerkZeitraum,
  preisPartner,
  preisEigenleistung,
  istEigenleistungPosition,
  summenPositionen,
} from '@/lib/auftraege/auftrag-leistung-phasen'
import type { HandwerkerNachrichtInput } from '@/lib/auftraege/handwerker-nachricht'
import type { HandwerkerBewertungZiel } from '@/lib/handwerker/handwerker-aus-auftrag'
import { formatEurBetrag } from '@/lib/dokument-zeilen'
import type { AuftragPosition, AuftragStatus } from '@/lib/types'
import { cn, formatPreis } from '@/lib/utils'

type GewerkOpt = { id: string; name: string; slug: string }

/** Gewerk-Name wie im Angebots-Wizard: Anzeige + Stift, kein Stammdaten-Dropdown. */
function GewerkEditableName({
  title,
  disabled,
  onRename,
}: {
  title: string
  disabled?: boolean
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)

  useEffect(() => {
    if (!editing) setDraft(title)
  }, [title, editing])

  function commit() {
    const next = draft.trim()
    if (!next) {
      toast.error('Gewerk darf nicht leer sein.')
      setDraft(title)
      setEditing(false)
      return
    }
    if (next !== title) onRename(next)
    setEditing(false)
  }

  return (
    <div className="gewerk-name-field">
      <span className="input-label">Gewerk</span>
      {editing ? (
        <input
          className="input w-full"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
            if (e.key === 'Escape') {
              setDraft(title)
              setEditing(false)
            }
          }}
          autoFocus
          aria-label="Gewerk bearbeiten"
        />
      ) : (
        <div className="gewerk-name-display">
          <span className="gewerk-name-text">{title}</span>
          <button
            type="button"
            className="gewerk-name-edit-btn"
            title="Gewerk bearbeiten"
            aria-label="Gewerk bearbeiten"
            disabled={disabled}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

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

export function AuftragPositionenSteuerungTab({
  auftragId,
  positionen,
  gewerke,
  handwerkerKontext,
  auftragStatus = 'offen',
  auftragAbgeschlossen = false,
  onBewerteHandwerker,
  onChanged,
}: {
  auftragId: string
  positionen: AuftragPosition[]
  gewerke: GewerkOpt[]
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragStatus?: AuftragStatus
  auftragAbgeschlossen?: boolean
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [openLeistungen, setOpenLeistungen] = useState<Set<string>>(() => new Set())
  const [hwMailModal, setHwMailModal] = useState<HandwerkerZuweisungMailTarget | null>(null)
  const sorted = useMemo(
    () => [...positionen].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [positionen]
  )

  const gewerkeBlocks = useMemo(
    () => groupAuftragPositionenByGewerk(sorted, gewerke),
    [sorted, gewerke]
  )

  const totals = useMemo(() => summenPositionen(sorted), [sorted])

  const allIds = useMemo(() => sorted.map((p) => p.id), [sorted])

  function toggleLeistung(id: string) {
    setOpenLeistungen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function savePosition(pos: AuftragPosition, patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) {
    startTransition(async () => {
      const r = await updateAuftragPositionSteuerung(pos.id, auftragId, patch)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function movePosition(id: string, dir: -1 | 1) {
    const idx = allIds.indexOf(id)
    if (idx < 0) return
    const target = idx + dir
    if (target < 0 || target >= allIds.length) return
    const next = [...allIds]
    const tmp = next[idx]!
    next[idx] = next[target]!
    next[target] = tmp
    startTransition(async () => {
      const r = await reorderAuftragPositionen(auftragId, next)
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function addGewerk(gewerk?: GewerkOpt) {
    const g = gewerk ?? gewerke[0]
    if (!g) {
      toast.error('Keine Gewerke in Stammdaten.')
      return
    }
    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        gewerk_slug: g.slug,
        gewerk_name: g.name,
        leistung_name: 'Neue Leistung',
        gewerk_block_key: `${g.slug}-${Date.now()}`,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function addLeistungToBlock(block: AuftragGewerkBlock) {
    const sample = block.positionen[0]
    startTransition(async () => {
      const r = await addAuftragPosition(auftragId, {
        gewerk_slug: block.gewerkSlug,
        gewerk_name: block.gewerkName,
        leistung_name: 'Neue Leistung',
        gewerk_block_key: sample?.gewerk_block_key ?? block.key,
      })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  function deleteBlock(block: AuftragGewerkBlock) {
    if (!confirm(`Gewerk „${block.gewerkName}“ mit ${block.positionen.length} Leistung(en) löschen?`)) return
    startTransition(async () => {
      for (const p of block.positionen) {
        const r = await deleteAuftragPosition(p.id, auftragId)
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      onChanged()
    })
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={HardHat}
        title="Keine Leistungen"
        description="Leistungen aus dem Angebot werden automatisch übernommen. Füge eine Gewerk-Gruppe hinzu."
        action={
          <Button type="button" variant="primary" size="sm" onClick={() => addGewerk()}>
            + Gewerk hinzufügen
          </Button>
        }
      />
    )
  }

  return (
    <div className="auftrag-pos-compact">
      <div className="pos-panel-head">
        <div className="pos-totals min-w-[220px] shrink-0 md:ml-auto">
          <div className="row">
            <div className="lbl">Verkauf</div>
            <div className="val">{formatEurBetrag(totals.verkauf)}</div>
          </div>
          <div className="row">
            <div className="lbl">EK Partner (Fremd)</div>
            <div className="val">{formatEurBetrag(totals.partner)}</div>
          </div>
          <div className="row">
            <div className="lbl">EK Eigen (intern)</div>
            <div className="val">{formatEurBetrag(totals.eigen)}</div>
          </div>
          <div className="row grand">
            <div className="lbl">Marge</div>
            <div className="val">{formatEurBetrag(totals.marge)}</div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={() => addGewerk()}>
          <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
          Gewerk-Gruppe hinzufügen
        </Button>
      </div>

      <div className="space-y-3">
        {gewerkeBlocks.map((block, blockIndex) => (
          <GewerkBlock
            key={block.key}
            index={blockIndex + 1}
            block={block}
            handwerkerKontext={handwerkerKontext}
            openLeistungen={openLeistungen}
            pending={pending}
            onToggleLeistung={toggleLeistung}
            onOpenHwMail={(mail) => setHwMailModal(mail)}
            onSavePosition={savePosition}
            onMovePosition={movePosition}
            onDeletePosition={(id) => {
              startTransition(async () => {
                const r = await deleteAuftragPosition(id, auftragId)
                if (!r.ok) toast.error(r.message)
                else onChanged()
              })
            }}
            onDeleteBlock={() => deleteBlock(block)}
            onAddLeistung={() => addLeistungToBlock(block)}
            onChanged={onChanged}
            auftragId={auftragId}
            auftragAbgeschlossen={auftragAbgeschlossen}
            onBewerteHandwerker={onBewerteHandwerker}
          />
        ))}
      </div>

      <HandwerkerZuweisungMailModal
        open={!!hwMailModal}
        onClose={() => setHwMailModal(null)}
        auftragId={auftragId}
        target={hwMailModal}
        onSent={onChanged}
      />
    </div>
  )
}

function GewerkBlock({
  index,
  block,
  handwerkerKontext,
  openLeistungen,
  pending,
  auftragId,
  onToggleLeistung,
  onOpenHwMail,
  onSavePosition,
  onMovePosition,
  onDeletePosition,
  onDeleteBlock,
  onAddLeistung,
  auftragAbgeschlossen,
  onBewerteHandwerker,
  onChanged,
}: {
  index: number
  block: AuftragGewerkBlock
  handwerkerKontext: HandwerkerZuweisenKontext
  openLeistungen: Set<string>
  pending: boolean
  auftragId: string
  auftragAbgeschlossen: boolean
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onToggleLeistung: (id: string) => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onSavePosition: (pos: AuftragPosition, patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMovePosition: (id: string, dir: -1 | 1) => void
  onDeletePosition: (id: string) => void
  onDeleteBlock: () => void
  onAddLeistung: () => void
  onChanged: () => void
}) {
  const [pendingLocal, startTransition] = useTransition()
  const zt = gewerkZeitraum(block)
  const posIds = block.positionen.map((p) => p.id)
  const gewerkId = block.gewerkId

  function patchBlock(meta: Omit<Parameters<typeof updateAuftragGewerkBlockMeta>[0], 'auftragId' | 'positionIds'>) {
    startTransition(async () => {
      const r = await updateAuftragGewerkBlockMeta({ auftragId, positionIds: posIds, ...meta })
      if (!r.ok) toast.error(r.message)
      else onChanged()
    })
  }

  return (
    <div className="gewerk-group">
      <div className="gewerk-group-head">
        <span className="gewerk-index-badge" aria-hidden>
          {index}
        </span>
        <div className="gewerk-group-head-fields">
          <GewerkEditableName
            title={block.gewerkName}
            disabled={pending || pendingLocal}
            onRename={(name) => patchBlock({ gewerk_name: name })}
          />
          <Input
            label="Von"
            type="date"
            value={zt.von ?? ''}
            onChange={(e) => patchBlock({ start_datum: e.target.value || null })}
          />
          <Input
            label="Bis"
            type="date"
            value={zt.bis ?? ''}
            onChange={(e) => patchBlock({ end_datum: e.target.value || null })}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-1 shrink-0">
          <Button type="button" variant="ghost" size="sm" disabled={pending || pendingLocal} onClick={onDeleteBlock}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="divide-y divide-bw-border">
        {block.positionen.map((pos) => (
          <LeistungRow
            key={pos.id}
            pos={pos}
            block={block}
            gewerkId={gewerkId}
            open={openLeistungen.has(pos.id)}
            pending={pending || pendingLocal}
            handwerkerKontext={handwerkerKontext}
            auftragId={auftragId}
            auftragIdForPortal={auftragId}
            onToggle={() => onToggleLeistung(pos.id)}
            onSave={(patch) => onSavePosition(pos, patch)}
            onMove={onMovePosition}
            onDelete={() => onDeletePosition(pos.id)}
            onOpenHwMail={onOpenHwMail}
            auftragAbgeschlossen={auftragAbgeschlossen}
            onBewerteHandwerker={onBewerteHandwerker}
            onChanged={onChanged}
          />
        ))}
      </div>

      <button type="button" className="pos-add-btn w-full" onClick={onAddLeistung}>
        <span className="icon-wrap">+</span>
        <span className="lbl-block">Leistung hinzufügen</span>
      </button>
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

function LeistungRow({
  pos,
  block,
  gewerkId,
  open,
  pending,
  handwerkerKontext,
  auftragId,
  auftragIdForPortal,
  onToggle,
  onSave,
  onMove,
  onDelete,
  onOpenHwMail,
  auftragAbgeschlossen,
  onBewerteHandwerker,
  onChanged,
}: {
  pos: AuftragPosition
  block: AuftragGewerkBlock
  gewerkId: string
  open: boolean
  pending: boolean
  handwerkerKontext: HandwerkerZuweisenKontext
  auftragId: string
  auftragIdForPortal: string
  auftragAbgeschlossen: boolean
  onBewerteHandwerker?: (ziel: HandwerkerBewertungZiel) => void
  onToggle: () => void
  onSave: (patch: Parameters<typeof updateAuftragPositionSteuerung>[2]) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDelete: () => void
  onOpenHwMail: (mail: HandwerkerZuweisungMailTarget) => void
  onChanged: () => void
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
      portalLink: buildPartnerLoginForAuftragUrl(auftragIdForPortal),
    }
  }, [hw?.name, pos, block.gewerkName, handwerkerKontext, auftragIdForPortal])

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
    <div className={cn('leistung-row', open && 'open')}>
      <button type="button" className="leistung-row-head" onClick={onToggle}>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 text-bw-text-muted transition-transform', open && 'rotate-180')}
          aria-hidden
        />
        <div className="leistung-row-head-main">
          <p className="leistung-row-title">{pos.leistung_name}</p>
        </div>
        <div className="leistung-row-head-end" onClick={(e) => e.stopPropagation()}>
          <span className={cn('leistung-status-badge', leistungStatusBadgeClass(leistungStatus))}>
            {leistungStatusLabel(leistungStatus)}
          </span>
          <span className="leistung-row-price">{formatPreis(pos.preis_fix ?? null, null, null)}</span>
          <button type="button" className="icon-btn text-status-cancel-text" title="Löschen" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </button>

      {open ? (
        <div className="leistung-row-body">
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
            </div>
          </div>

          <div className="leistung-acc-foot">
            <button type="button" className="icon-btn" title="Nach oben" onClick={() => onMove(pos.id, -1)}>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button type="button" className="icon-btn" title="Nach unten" onClick={() => onMove(pos.id, 1)}>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
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
    </div>
  )
}

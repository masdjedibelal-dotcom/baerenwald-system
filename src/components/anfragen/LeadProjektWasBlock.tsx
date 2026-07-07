'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/app-toast'
import { Textarea } from '@/components/ui/Textarea'
import { saveLeadProjektWasZeilen } from '@/app/(dashboard)/anfragen/actions'
import {
  neueWasZeilenId,
  parseProjektWasZeilen,
  type ProjektWasZeile,
} from '@/lib/lead-projekt-was'
import { getHinweisForPosition, gewerkById } from '@/lib/gewerke-ausfuehrung'
import { cn } from '@/lib/utils'
import type { Gewerk, LeadDetail, Preisliste } from '@/lib/types'

import {
  POSITION_MENGE_EINHEITEN,
  groesseEinheitLabel,
  isMengeEinheitMengeMalEinheitspreis,
} from '@/lib/dokument-einheiten'

function neueLeereZeile(): ProjektWasZeile {
  return {
    id: neueWasZeilenId(),
    titel: '',
    beschreibung: '',
    menge: 1,
    einheit: 'pauschal',
    relevant_fuer_rechnung: true,
    ergaenzungen: [],
  }
}

function WizardField({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  full?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('wizard-field', full && 'full')}>
      <span className="wizard-field-label">
        {label}
        {required ? <span className="text-bw-danger"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="wizard-field-hint">{hint}</span> : null}
    </div>
  )
}

export type LeadProjektWasBlockHandle = {
  addLeistung: () => void
}

type Props = {
  lead: LeadDetail
  gewerke?: Gewerk[]
  preislisten?: Preisliste[]
  onSaved?: () => void
}

export const LeadProjektWasBlock = forwardRef<LeadProjektWasBlockHandle, Props>(function LeadProjektWasBlock(
  { lead, gewerke = [], preislisten = [], onSaved },
  ref
) {
  const [pending, startTransition] = useTransition()
  const [zeilen, setZeilen] = useState<ProjektWasZeile[]>(() =>
    parseProjektWasZeilen(lead.funnel_daten, {
      bereiche: lead.bereiche,
      situation: lead.situation,
      gewerke,
    })
  )
  const [openId, setOpenId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)

  const hatPreisliste = preislisten.length > 0

  useEffect(() => {
    setZeilen(
      parseProjektWasZeilen(lead.funnel_daten, {
        bereiche: lead.bereiche,
        situation: lead.situation,
        gewerke,
      })
    )
    setOpenId(null)
    setDirty(false)
  }, [lead.funnel_daten, lead.bereiche, lead.situation, gewerke])

  const persist = useCallback(
    (next: ProjektWasZeile[]) => {
      startTransition(async () => {
        const res = await saveLeadProjektWasZeilen(lead.id, next)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        setZeilen(next)
        setDirty(false)
        onSaved?.()
      })
    },
    [lead.id, onSaved]
  )

  const patchLocal = useCallback((id: string, patch: Partial<ProjektWasZeile>) => {
    setZeilen((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)))
    setDirty(true)
  }, [])

  const toggleRelevant = useCallback(
    (id: string, checked: boolean) => {
      const next = zeilen.map((z) =>
        z.id === id ? { ...z, relevant_fuer_rechnung: checked } : z
      )
      setZeilen(next)
      persist(next)
    },
    [zeilen, persist]
  )

  const addNew = useCallback(() => {
    const row = neueLeereZeile()
    setZeilen((prev) => [...prev, row])
    setOpenId(row.id)
    setDirty(true)
  }, [])

  useImperativeHandle(ref, () => ({ addLeistung: addNew }), [addNew])

  const removeAt = useCallback(
    (id: string) => {
      const next = zeilen.filter((z) => z.id !== id)
      setZeilen(next)
      if (openId === id) setOpenId(null)
      persist(next)
      toast.success('Leistung entfernt.')
    },
    [zeilen, openId, persist]
  )

  const finishEdit = useCallback(
    (id: string) => {
      const row = zeilen.find((z) => z.id === id)
      if (!row?.titel.trim()) {
        const next = zeilen.filter((z) => z.id !== id)
        setZeilen(next)
        setOpenId(null)
        setDirty(false)
        if (next.length !== zeilen.length) persist(next)
        return
      }
      if (!row.gewerk_id && hatPreisliste) {
        toast.error('Bitte ein Gewerk wählen.')
        return
      }
      if (hatPreisliste && !row.preisliste_id && !row.titel.trim()) {
        toast.error('Bitte eine Leistung aus der Liste wählen.')
        return
      }
      setOpenId(null)
      if (dirty) persist(zeilen)
    },
    [zeilen, dirty, persist, hatPreisliste]
  )

  return (
    <div className="konkrete-leistungen-block">
      <div className="props lead-konkrete-props">
        {zeilen.map((z) => (
          <ProjektLeistungAccordion
            key={z.id}
            zeile={z}
            gewerke={gewerke}
            preislisten={preislisten}
            preislisteMode={hatPreisliste}
            open={openId === z.id}
            pending={pending}
            onToggle={() => setOpenId(openId === z.id ? null : z.id)}
            onClose={() => finishEdit(z.id)}
            onPatch={(patch) => patchLocal(z.id, patch)}
            onToggleRelevant={(checked) => toggleRelevant(z.id, checked)}
            onRemove={() => removeAt(z.id)}
          />
        ))}
      </div>
    </div>
  )
})

LeadProjektWasBlock.displayName = 'LeadProjektWasBlock'

function ProjektLeistungAccordion({
  zeile,
  gewerke,
  preislisten,
  preislisteMode,
  open,
  pending,
  onToggle,
  onClose,
  onPatch,
  onToggleRelevant,
  onRemove,
}: {
  zeile: ProjektWasZeile
  gewerke: Gewerk[]
  preislisten: Preisliste[]
  preislisteMode: boolean
  open: boolean
  pending: boolean
  onToggle: () => void
  onClose: () => void
  onPatch: (patch: Partial<ProjektWasZeile>) => void
  onToggleRelevant: (checked: boolean) => void
  onRemove: () => void
}) {
  const inRechnung = zeile.relevant_fuer_rechnung
  const isNew = !zeile.titel.trim()

  const leistungenForGewerk = useMemo(
    () =>
      preislisten.filter((p) => p.aktiv && p.gewerk_id === zeile.gewerk_id),
    [preislisten, zeile.gewerk_id]
  )

  const leistungSelectValue = useMemo(() => {
    if (zeile.preisliste_id) return zeile.preisliste_id
    const match = leistungenForGewerk.find(
      (p) => p.leistung.trim() === zeile.titel.trim()
    )
    return match?.id ?? ''
  }, [zeile.preisliste_id, zeile.titel, leistungenForGewerk])

  function applyPreisliste(plId: string) {
    if (!plId) return
    const pl = preislisten.find((p) => p.id === plId)
    const gewerk = gewerkById(gewerke, zeile.gewerk_id ?? pl?.gewerk_id)
    if (!pl || !gewerk) return
    const menge =
      pl.einheit === 'm²' || pl.einheit === 'm2' || isMengeEinheitMengeMalEinheitspreis(pl.einheit)
        ? 20
        : 1
    const hinweis = getHinweisForPosition(gewerk.id, gewerke)
    onPatch({
      titel: pl.leistung,
      menge,
      einheit: pl.einheit || 'pauschal',
      gewerk_id: gewerk.id,
      preisliste_id: pl.id,
      bereich_key: undefined,
      beschreibung: hinweis || undefined,
    })
  }

  const beschreibungAnzeige = zeile.beschreibung?.trim() || '—'
  const leistungTitel = zeile.titel.trim()

  return (
    <div className={cn('lead-leistung-item', open && 'open', !inRechnung && 'excluded')}>
      <div
        className="prop prop-leistung"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <div className="prop-l">
          <span
            className="lead-prop-titel"
            title={leistungTitel || undefined}
          >
            {leistungTitel ? (
              leistungTitel
            ) : (
              <span className="font-normal text-bw-text-subtle">(neue Leistung)</span>
            )}
          </span>
        </div>
        <div className="prop-v lead-prop-beschreibung">
          <span className="lead-prop-desc">{beschreibungAnzeige}</span>
        </div>
        <ChevronDown
          className={cn('lead-prop-chevron h-3.5 w-3.5 shrink-0', open && 'open')}
          aria-hidden
        />
      </div>

      {open ? (
        <>
          <div className="lead-leistung-panel">
            {preislisteMode ? (
              <>
                <WizardField
                  label="Gewerk"
                  hint="nur intern · erscheint nicht auf der Rechnung"
                >
                  <select
                    className="input w-full"
                    value={zeile.gewerk_id ?? ''}
                    disabled={pending}
                    onChange={(e) => {
                      const gid = e.target.value
                      onPatch({
                        gewerk_id: gid || undefined,
                        titel: '',
                        preisliste_id: undefined,
                        beschreibung: undefined,
                        bereich_key: undefined,
                      })
                    }}
                  >
                    <option value="">Gewerk wählen…</option>
                    {gewerke
                      .filter((g) => g.aktiv !== false)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </WizardField>

                <WizardField label="Leistung" required>
                  <select
                    className="input w-full"
                    value={leistungSelectValue}
                    disabled={pending || !zeile.gewerk_id}
                    onChange={(e) => applyPreisliste(e.target.value)}
                  >
                    <option value="">
                      {zeile.gewerk_id ? 'Leistung wählen…' : 'Zuerst Gewerk wählen…'}
                    </option>
                    {leistungenForGewerk.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.leistung}
                      </option>
                    ))}
                  </select>
                </WizardField>
              </>
            ) : (
              <>
                <WizardField label="Leistung" required>
                  <input
                    className="input w-full"
                    value={zeile.titel}
                    disabled={pending}
                    placeholder="z. B. Wandfliesen verlegen"
                    autoFocus={isNew}
                    onChange={(e) => onPatch({ titel: e.target.value })}
                  />
                </WizardField>
                <WizardField
                  label="Gewerk"
                  hint="nur intern · erscheint nicht auf der Rechnung"
                >
                  <select
                    className="input w-full"
                    value={zeile.gewerk_id ?? ''}
                    disabled={pending}
                    onChange={(e) => {
                      const gid = e.target.value
                      const gewerk = gewerkById(gewerke, gid)
                      const hinweis = gewerk
                        ? getHinweisForPosition(gewerk.id, gewerke)
                        : ''
                      onPatch({
                        gewerk_id: gid || undefined,
                        preisliste_id: undefined,
                        beschreibung: hinweis || undefined,
                      })
                    }}
                  >
                    <option value="">Gewerk wählen…</option>
                    {gewerke
                      .filter((g) => g.aktiv !== false)
                      .map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                  </select>
                </WizardField>
              </>
            )}

            <WizardField
              label="Beschreibung"
              hint="Details für Kunden & spätere Rechnung"
              full
            >
              <Textarea
                rows={3}
                disabled={pending}
                value={zeile.beschreibung ?? ''}
                placeholder="z. B. inkl. Untergrund vorbereiten, Material, Endreinigung"
                onChange={(e) => onPatch({ beschreibung: e.target.value })}
              />
            </WizardField>

            <WizardField label="Menge">
              <div className="lead-leistung-menge">
                <input
                  className="input min-w-0 flex-1"
                  type="number"
                  step="0.5"
                  min={0.01}
                  disabled={pending}
                  value={zeile.menge}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    onPatch({
                      menge: Number.isFinite(v) && v > 0 ? v : 1,
                    })
                  }}
                />
                <select
                  className="input shrink-0"
                  value={zeile.einheit}
                  disabled={pending}
                  onChange={(e) => onPatch({ einheit: e.target.value })}
                >
                  {POSITION_MENGE_EINHEITEN.map((u) => (
                    <option key={u} value={u}>
                      {groesseEinheitLabel(u)}
                    </option>
                  ))}
                </select>
              </div>
            </WizardField>

            <label className="lead-leistung-invoice-toggle">
              <input
                type="checkbox"
                checked={inRechnung}
                disabled={pending}
                onChange={(e) => onToggleRelevant(e.target.checked)}
              />
              <span>In Angebot / Rechnung übernehmen</span>
            </label>

            <div className="lead-leistung-panel-foot">
              <button
                type="button"
                className="btn btn-ghost btn-sm gap-1.5"
                disabled={pending}
                onClick={onRemove}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Entfernen
              </button>
              <div className="flex-1" />
              <button
                type="button"
                className="btn btn-primary btn-sm gap-1.5"
                disabled={pending}
                onClick={onClose}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Fertig
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

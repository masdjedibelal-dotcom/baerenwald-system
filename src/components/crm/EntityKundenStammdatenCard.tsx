'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { saveKunde } from '@/app/actions/kunden'
import { updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { splitDeutscherVollname } from '@/lib/kunde-namen'
import { kundentypLabel } from '@/lib/lead-display-helpers'
import { StammdatenPortalZeile } from '@/components/crm/StammdatenPortalZeile'
import { cn } from '@/lib/utils'

function telHref(tel: string) {
  return `tel:${tel.replace(/\s/g, '')}`
}

export type EntityKundenStammDraft = {
  name: string
  telefon: string
  email: string
  plz: string
  ort: string
  strasse: string
}

type Props = {
  kundeId?: string | null
  leadId?: string | null
  kundeTyp?: string | null
  initial: EntityKundenStammDraft
  /** @deprecated nicht in Stammdaten-View */
  quelle?: string | null
  /** @deprecated nicht in Stammdaten-View */
  eingegangen?: string | null
  onSaved?: () => void
  disabled?: boolean
}

/**
 * Stammdaten als Mock-Identitätskarte (`.vgid`).
 * Bearbeiten = EditorSheet (Desktop Slide-over 560px · mobil Bottom Sheet) — kein Inline-Edit.
 */
export function EntityKundenStammdatenCard({
  kundeId,
  leadId,
  kundeTyp,
  initial,
  onSaved,
  disabled,
}: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState(initial)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!sheetOpen) setDraft(initial)
  }, [initial, sheetOpen])

  const typLbl = kundentypLabel(kundeTyp)
  const region =
    draft.ort.trim() && draft.plz.trim()
      ? `${draft.ort.trim()} · ${draft.plz.trim()}`
      : draft.ort.trim() || draft.plz.trim() || ''
  const metaParts = [
    typLbl && typLbl !== '—' ? typLbl : null,
    region || null,
  ].filter(Boolean) as string[]

  const canEdit = !disabled && Boolean(kundeId?.trim() || leadId?.trim())

  function patch(p: Partial<EntityKundenStammDraft>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  function openSheet() {
    setDraft(initial)
    setSheetOpen(true)
  }

  function closeSheet() {
    setDraft(initial)
    setSheetOpen(false)
  }

  function save() {
    if (!draft.name.trim()) {
      toast.error('Name ist erforderlich.')
      return
    }
    startTransition(async () => {
      if (kundeId?.trim()) {
        const { vorname, nachname } = splitDeutscherVollname(draft.name)
        const r = await saveKunde(
          {
            name: draft.name.trim(),
            vorname: vorname || null,
            nachname: nachname || null,
            typ: kundeTyp?.trim() || 'privat',
            telefon: draft.telefon.trim() || null,
            email: draft.email.trim() || null,
            plz: draft.plz.trim() || null,
            ort: draft.ort.trim() || null,
            strasse: draft.strasse.trim() || null,
            stammPflicht: false,
          },
          kundeId,
          leadId ? { revalidateAnfrageIds: [leadId] } : undefined
        )
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      if (leadId?.trim()) {
        const r = await updateLeadKontakt(leadId, {
          kontakt_name: draft.name.trim(),
          kontakt_telefon: draft.telefon.trim() || null,
          kontakt_email: draft.email.trim() || null,
          plz: draft.plz.trim() || null,
        })
        if (!r.ok) {
          toast.error(r.message)
          return
        }
      }
      if (!kundeId?.trim() && !leadId?.trim()) {
        toast.error('Kein Kunde oder Lead zum Speichern verknüpft.')
        return
      }
      toast.success('Stammdaten gespeichert')
      setSheetOpen(false)
      onSaved?.()
    })
  }

  const objektRegionValue =
    region ||
    [draft.ort.trim(), draft.plz.trim()].filter(Boolean).join(' · ') ||
    draft.strasse.trim() ||
    ''

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-title title">Stammdaten</div>
          {canEdit ? (
            <button
              type="button"
              className="qa-btn"
              title="Stammdaten bearbeiten"
              aria-label="Stammdaten bearbeiten"
              onClick={openSheet}
            >
              <MockIcon ctx="default" n="pencil" size={14} />
            </button>
          ) : null}
        </div>
        <div className="card-b">
          <div className="vgid">
            <div className="vgid-name">{draft.name.trim() || '—'}</div>
            {metaParts.length > 0 ? (
              <div className="vgid-meta">{metaParts.join(' · ')}</div>
            ) : null}

            {(draft.telefon.trim() ||
              draft.email.trim() ||
              kundeId?.trim()) && (
              <div className="vgid-chips">
                {draft.telefon.trim() ? (
                  <a className="vgid-chip" href={telHref(draft.telefon)}>
                    <MockIcon ctx="default" n="phone" size={14} />
                    {draft.telefon.trim()}
                  </a>
                ) : null}
                {draft.email.trim() ? (
                  <a className="vgid-chip" href={`mailto:${draft.email.trim()}`}>
                    <MockIcon ctx="default" n="mail" size={14} />
                    {draft.email.trim()}
                  </a>
                ) : null}
                {kundeId?.trim() ? (
                  <Link
                    className="vgid-chip ghost"
                    href={`/kunden/${kundeId.trim()}`}
                  >
                    <MockIcon ctx="default" n="user" size={14} />
                    Kundenakte
                  </Link>
                ) : null}
              </div>
            )}

            <StammdatenPortalZeile
              kundeId={kundeId}
              fallbackEmail={draft.email}
              variant="vgid"
            />
          </div>
        </div>
      </div>

      <EditorSheet
        open={sheetOpen}
        onClose={closeSheet}
        title="Stammdaten bearbeiten"
        subtitle={kundeId ? 'Kundenakte' : null}
        size="lg"
        dirty={false}
        footer={
          <div
            className="phase-sheet-footer"
            style={{ justifyContent: 'space-between', width: '100%' }}
          >
            <button
              type="button"
              className="btn ghost"
              onClick={closeSheet}
              disabled={pending}
            >
              Abbrechen
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={save}
              disabled={pending}
            >
              <MockIcon ctx="default" n="check" size={14} />
              Speichern
            </button>
          </div>
        }
      >
        <div className="form-grid" style={{ gridTemplateColumns: '1fr', gap: 14 }}>
          <label className="field">
            <span>Kunde</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              autoFocus
            />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input
              className="input"
              type="tel"
              value={draft.telefon}
              onChange={(e) => patch({ telefon: e.target.value })}
            />
          </label>
          <label className="field">
            <span>E-Mail</span>
            <input
              className="input"
              type="email"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Objekt / Region</span>
            <input
              className="input"
              value={objektRegionValue}
              onChange={(e) => {
                const v = e.target.value
                // „Ort · PLZ" oder freier Text → ort/plz splitten
                const parts = v.split('·').map((s) => s.trim())
                if (parts.length >= 2) {
                  const maybePlz = parts[parts.length - 1] ?? ''
                  if (/^\d{4,5}$/.test(maybePlz)) {
                    patch({
                      ort: parts.slice(0, -1).join(' · ').trim(),
                      plz: maybePlz,
                    })
                    return
                  }
                }
                patch({ ort: v, plz: draft.plz })
              }}
            />
          </label>

          <div
            className={cn(
              'flex items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-2.5'
            )}
          >
            <MockIcon ctx="default" n="info-circle" size={14} />
            <p className="m-0 text-[length:var(--fs-meta)] leading-snug text-bw-text-muted">
              Telefon, E-Mail und Objekt gehören zur Kundenakte — Änderungen gelten für alle
              Vorgänge dieses Kunden.
            </p>
          </div>
        </div>
      </EditorSheet>
    </>
  )
}

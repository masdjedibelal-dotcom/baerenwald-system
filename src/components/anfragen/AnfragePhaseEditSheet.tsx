'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { MockIcon } from '@/components/mock-ui/MockIcon'
import { toast } from '@/components/ui/app-toast'
import { updateLeadBeschreibung, updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { kanalLabel } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'

/**
 * Split-over „Anfrage bearbeiten“ (Desktop Slide-over · mobil Bottom Sheet).
 * Gleiches Sheet wie aus dem Phasen-Verlauf → Bearbeiten.
 */
export function AnfragePhaseEditSheet({
  open,
  lead,
  onClose,
  onSaved,
}: {
  open: boolean
  lead: LeadDetail | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [telefon, setTelefon] = useState('')
  const [email, setEmail] = useState('')
  const [anliegen, setAnliegen] = useState('')
  const [ort, setOrt] = useState('')
  const [plz, setPlz] = useState('')
  const [budgetVon, setBudgetVon] = useState('')
  const [budgetBis, setBudgetBis] = useState('')
  const [notiz, setNotiz] = useState('')
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open || !lead) return
    setName(lead.kontakt_name ?? '')
    setTelefon(lead.kontakt_telefon ?? '')
    setEmail(lead.kontakt_email ?? '')
    setAnliegen(lead.situation ?? '')
    setOrt(lead.kunden?.ort ?? '')
    setPlz(lead.plz ?? lead.kunden?.plz ?? '')
    setBudgetVon(lead.preis_min != null ? String(lead.preis_min) : '')
    setBudgetBis(
      lead.preis_max != null
        ? String(lead.preis_max)
        : lead.budget_ca != null
          ? String(lead.budget_ca)
          : ''
    )
    setNotiz(lead.kontakt_nachricht ?? '')
  }, [open, lead])

  function save() {
    if (!lead) return
    startTransition(async () => {
      const k = await updateLeadKontakt(lead.id, {
        kontakt_name: name.trim() || '—',
        kontakt_telefon: telefon.trim() || null,
        kontakt_email: email.trim() || null,
        plz: plz.trim() || null,
      })
      if (!k.ok) {
        toast.error(k.message)
        return
      }
      const b = await updateLeadBeschreibung(lead.id, notiz)
      if (!b.ok) {
        toast.error(b.message)
        return
      }
      toast.success('Anfrage gespeichert')
      onSaved()
    })
  }

  return (
    <EditorSheet
      open={open && Boolean(lead)}
      onClose={onClose}
      title="Anfrage bearbeiten"
      size="lg"
      dirty={false}
      overlayClassName="editor-sheet-overlay--stack"
      footer={
        <div className="phase-sheet-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={pending}>
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
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted">
          Kontakt
        </p>
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Telefon</span>
          <input className="input" value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </label>
        <label className="field">
          <span>E-Mail</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted mt-3">
          Anliegen
        </p>
        <label className="field">
          <span>Leistung / Projekt</span>
          <input
            className="input"
            value={anliegen}
            onChange={(e) => setAnliegen(e.target.value)}
            readOnly
            title="Vorhaben über Bearbeiten-Wizard ändern"
          />
        </label>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">
            <span>Region / Stadtteil</span>
            <input className="input" value={ort} onChange={(e) => setOrt(e.target.value)} readOnly />
          </label>
          <label className="field">
            <span>PLZ</span>
            <input className="input" value={plz} onChange={(e) => setPlz(e.target.value)} />
          </label>
          <label className="field">
            <span>Budget von</span>
            <input className="input" value={budgetVon} readOnly />
          </label>
          <label className="field">
            <span>Budget bis</span>
            <input className="input" value={budgetBis} readOnly />
          </label>
        </div>
        <label className="field">
          <span>Quelle</span>
          <input className="input" value={lead ? kanalLabel(lead.kanal) : ''} readOnly />
        </label>
        <label className="field">
          <span>Notiz</span>
          <textarea
            className="input"
            rows={4}
            value={notiz}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </label>
      </div>
    </EditorSheet>
  )
}

'use client'
import { MockInput, MockTextarea } from '@/components/mock-ui/MockForm'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { toast } from '@/components/ui/app-toast'
import { updateLeadBeschreibung, updateLeadKontakt } from '@/app/(dashboard)/anfragen/actions'
import { kanalLabel } from '@/lib/utils'
import type { LeadDetail } from '@/lib/types'
import { TOAST } from '@/lib/copy'

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
  const [baseline, setBaseline] = useState({
    name: '',
    telefon: '',
    email: '',
    anliegen: '',
    ort: '',
    plz: '',
    budgetVon: '',
    budgetBis: '',
    notiz: '',
  })

  useEffect(() => {
    if (!open || !lead) return
    const next = {
      name: lead.kontakt_name ?? '',
      telefon: lead.kontakt_telefon ?? '',
      email: lead.kontakt_email ?? '',
      anliegen: lead.situation ?? '',
      ort: lead.kunden?.ort ?? '',
      plz: lead.plz ?? lead.kunden?.plz ?? '',
      budgetVon: lead.preis_min != null ? String(lead.preis_min) : '',
      budgetBis:
        lead.preis_max != null
          ? String(lead.preis_max)
          : lead.budget_ca != null
            ? String(lead.budget_ca)
            : '',
      notiz: lead.kontakt_nachricht ?? '',
    }
    setName(next.name)
    setTelefon(next.telefon)
    setEmail(next.email)
    setAnliegen(next.anliegen)
    setOrt(next.ort)
    setPlz(next.plz)
    setBudgetVon(next.budgetVon)
    setBudgetBis(next.budgetBis)
    setNotiz(next.notiz)
    setBaseline(next)
  }, [open, lead])

  const dirty =
    name !== baseline.name ||
    telefon !== baseline.telefon ||
    email !== baseline.email ||
    anliegen !== baseline.anliegen ||
    ort !== baseline.ort ||
    plz !== baseline.plz ||
    budgetVon !== baseline.budgetVon ||
    budgetBis !== baseline.budgetBis ||
    notiz !== baseline.notiz

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
        toast.systemError(k)
        return
      }
      const b = await updateLeadBeschreibung(lead.id, notiz)
      if (!b.ok) {
        toast.systemError(b)
        return
      }
      toast.success(TOAST.anfrage_gespeichert)
      setBaseline({
        name,
        telefon,
        email,
        anliegen,
        ort,
        plz,
        budgetVon,
        budgetBis,
        notiz,
      })
      onSaved()
    })
  }

  return (
    <EditorSheet
      open={open && Boolean(lead)}
      onClose={onClose}
      title="Anfrage bearbeiten"
      size="lg"
      dirty={dirty}
      overlayClassName="editor-sheet-overlay--stack"
      primary={{
        label: 'Speichern',
        onClick: save,
        disabled: pending,
        busy: pending,
        icon: 'check',
      }}
    >
      <div className="form-grid" style={{ gridTemplateColumns: '1fr' }}>
        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted">
          Kontakt
        </p>
        <label className="field">
          <span>Name</span>
          <MockInput value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span>Telefon</span>
          <MockInput value={telefon} onChange={(e) => setTelefon(e.target.value)} />
        </label>
        <label className="field">
          <span>E-Mail</span>
          <MockInput value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <p className="text-[length:var(--fs-meta)] font-bold uppercase tracking-wide text-bw-text-muted mt-3">
          Anliegen
        </p>
        <label className="field">
          <span>Leistung / Projekt</span>
          <MockInput value={anliegen} onChange={(e) => setAnliegen(e.target.value)} readOnly title="Vorhaben über Bearbeiten-Wizard ändern" />
        </label>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <label className="field">
            <span>Region / Stadtteil</span>
            <MockInput value={ort} onChange={(e) => setOrt(e.target.value)} readOnly />
          </label>
          <label className="field">
            <span>PLZ</span>
            <MockInput value={plz} onChange={(e) => setPlz(e.target.value)} />
          </label>
          <label className="field">
            <span>Budget von</span>
            <MockInput value={budgetVon} readOnly />
          </label>
          <label className="field">
            <span>Budget bis</span>
            <MockInput value={budgetBis} readOnly />
          </label>
        </div>
        <label className="field">
          <span>Quelle</span>
          <MockInput value={lead ? kanalLabel(lead.kanal) : ''} readOnly />
        </label>
        <label className="field">
          <span>Notiz</span>
          <MockTextarea rows={4} value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        </label>
      </div>
    </EditorSheet>
  )
}

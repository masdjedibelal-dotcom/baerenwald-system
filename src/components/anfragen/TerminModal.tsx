'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { insertKalenderTermin, updateLeadStatus } from '@/app/(dashboard)/anfragen/actions'
import { sendBesichtigungTerminBestaetigung } from '@/app/actions/mails'
import { toast } from '@/components/ui/app-toast'
import type { KalenderTermin, LeadStatus } from '@/lib/types'
const TYP_OPTIONS: { value: KalenderTermin['typ']; label: string }[] = [
  { value: 'besichtigung', label: 'Besichtigung' },
  { value: 'beginn', label: 'Beginn' },
  { value: 'abnahme', label: 'Abnahme' },
  { value: 'sonstiges', label: 'Sonstiges / Vor-Ort' },
]

type Props = {
  open: boolean
  onClose: () => void
  leadId: string
  kontaktEmail?: string | null
  kontaktName?: string | null
  defaultPlz?: string | null
  leadStatus: LeadStatus
  onSaved?: () => void
  /** Termin-Typ fest (z. B. nur Besichtigung) */
  typFixed?: KalenderTermin['typ']
}

export function TerminModal({
  open,
  onClose,
  leadId,
  kontaktEmail,
  kontaktName,
  defaultPlz,
  leadStatus,
  onSaved,
  typFixed,
}: Props) {
  const [typ, setTyp] = useState<KalenderTermin['typ']>(typFixed ?? 'besichtigung')
  const [datum, setDatum] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [adresse, setAdresse] = useState(defaultPlz ?? '')
  const [notiz, setNotiz] = useState('')
  const [mailToggle, setMailToggle] = useState(true)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTyp('besichtigung')
    setDatum('')
    setVon('')
    setBis('')
    setAdresse(defaultPlz ?? '')
    setNotiz('')
    setMailToggle(true)
  }

  async function save(sendMail: boolean) {
    if (!datum.trim()) {
      toast.error('Bitte Datum wählen.')
      return
    }
    setSaving(true)
    const effTyp = typFixed ?? typ
    const titel = TYP_OPTIONS.find((t) => t.value === effTyp)?.label ?? 'Termin'
    const res = await insertKalenderTermin({
      lead_id: leadId,
      titel,
      datum,
      uhrzeit_von: von.trim() || null,
      uhrzeit_bis: bis.trim() || null,
      typ: effTyp,
      adresse: adresse.trim() || null,
      beschreibung: notiz.trim() || null,
    })
    if (!res.ok) {
      setSaving(false)
      toast.error(res.message)
      return
    }

    if (leadStatus === 'neu') {
      const st = await updateLeadStatus(leadId, 'kontaktiert')
      if (!st.ok) toast.error(st.message)
    }

    if (sendMail && mailToggle && kontaktEmail?.trim()) {
      const mailRes = await sendBesichtigungTerminBestaetigung({
        leadId,
        to: kontaktEmail.trim(),
        name: kontaktName?.trim() || 'Kundin/Kunde',
        terminTitel: titel,
        datum,
        uhrzeitVon: von.trim() || null,
        uhrzeitBis: bis.trim() || null,
        adresse: adresse.trim() || null,
        notiz: notiz.trim() || null,
      })
      if (!mailRes.ok) {
        setSaving(false)
        toast.success('Termin gespeichert.')
        toast.error(mailRes.message)
        reset()
        onClose()
        onSaved?.()
        return
      }
    }

    setSaving(false)
    toast.success(
      sendMail && mailToggle && kontaktEmail?.trim()
        ? 'Termin gespeichert und Bestätigung per E-Mail versendet.'
        : 'Termin gespeichert.'
    )
    reset()
    onClose()
    onSaved?.()
  }

  const previewBody = `Guten Tag ${kontaktName ?? 'Kundin/Kunde'},\n\nwir bestätigen Ihren Termin am ${datum || '…'}${von ? ` um ${von} Uhr` : ''}.\n\nAdresse: ${adresse || '—'}\n\nFreundliche Grüße\nBärenwald`

  return (
    <Modal open={open} onClose={onClose} title="Termin vereinbaren" size="lg">
      <div className="form-grid-2 grid gap-3 md:grid-cols-2">
        {typFixed ? null : (
          <label className="md:col-span-1">
            <span className="input-label">Typ</span>
            <select className="input" value={typ} onChange={(e) => setTyp(e.target.value as KalenderTermin['typ'])}>
              {TYP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="input-label">Datum</span>
          <input type="date" className="input" value={datum} onChange={(e) => setDatum(e.target.value)} required />
        </label>
        <label>
          <span className="input-label">Uhrzeit von</span>
          <input type="time" className="input" value={von} onChange={(e) => setVon(e.target.value)} />
        </label>
        <label>
          <span className="input-label">Uhrzeit bis</span>
          <input type="time" className="input" value={bis} onChange={(e) => setBis(e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="input-label">Adresse</span>
          <input type="text" className="input" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </label>
        <label className="md:col-span-2">
          <span className="input-label">Notiz</span>
          <textarea className="input min-h-[72px]" value={notiz} onChange={(e) => setNotiz(e.target.value)} />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-bw-border bg-bw-bg p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={mailToggle} onChange={(e) => setMailToggle(e.target.checked)} />
          Bestätigungs-Mail an Kunden ({kontaktEmail ?? 'keine E-Mail'})
        </label>
        {mailToggle && kontaktEmail ? (
          <div className="mt-2 rounded border border-bw-border bg-bw-card p-2 text-xs text-bw-text">
            <p className="text-bw-text-muted">An: {kontaktEmail}</p>
            <p className="mt-1 whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{previewBody}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-bw-border pt-4">
        <Button type="button" variant="secondary" onClick={onClose}>
          Abbrechen
        </Button>
        <Button type="button" variant="secondary" loading={saving} onClick={() => void save(false)}>
          Speichern ohne Mail
        </Button>
        <Button type="button" variant="primary" loading={saving} onClick={() => void save(true)}>
          Speichern + Mail senden
        </Button>
      </div>
    </Modal>
  )
}

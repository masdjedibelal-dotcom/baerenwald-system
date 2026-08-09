'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { FormSheet } from '@/components/ui/FormSheet'
import { Button } from '@/components/ui/Button'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Textarea } from '@/components/ui/Textarea'
import {
  insertKalenderTermin,
  loadCrmTeamFuerTermin,
  saveLeadTerminVereinbart,
} from '@/app/(dashboard)/anfragen/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import { toast } from '@/components/ui/app-toast'
import {
  TerminBestaetigungMailEditor,
  type TerminMailDraft,
} from '@/components/anfragen/TerminBestaetigungMailEditor'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { KALENDER_TYP_LABEL } from '@/lib/kalender-styles'
import type { KalenderTermin } from '@/lib/types'

const TYP_OPTIONS: { value: KalenderTermin['typ']; label: string }[] = [
  { value: 'besichtigung', label: KALENDER_TYP_LABEL.besichtigung },
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
  kundenTyp?: string | null
  leadKundentyp?: string | null
  defaultPlz?: string | null
  defaultAdresse?: string | null
  onSaved?: () => void
  typFixed?: KalenderTermin['typ']
}

export function TerminModal({
  open,
  onClose,
  leadId,
  kontaktEmail,
  kontaktName,
  kundenTyp,
  leadKundentyp,
  defaultPlz,
  defaultAdresse,
  onSaved,
  typFixed,
}: Props) {
  const initialAdresse = (defaultAdresse?.trim() || defaultPlz?.trim() || '').trim()
  const [typ, setTyp] = useState<KalenderTermin['typ']>(typFixed ?? 'besichtigung')
  const [datum, setDatum] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [adresse, setAdresse] = useState(initialAdresse)
  const [notiz, setNotiz] = useState('')
  const [mitarbeiterId, setMitarbeiterId] = useState('')
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [mailToggle, setMailToggle] = useState(true)
  const [mailDraft, setMailDraft] = useState<TerminMailDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const istBesichtigung = (typFixed ?? typ) === 'besichtigung'

  useEffect(() => {
    if (!open) return
    setAdresse((defaultAdresse?.trim() || defaultPlz?.trim() || '').trim())
    setTeamLoading(true)
    void loadCrmTeamFuerTermin()
      .then((list) => setTeam(list))
      .finally(() => setTeamLoading(false))
  }, [open, defaultAdresse, defaultPlz])

  function reset() {
    setTyp('besichtigung')
    setDatum('')
    setVon('')
    setBis('')
    setAdresse((defaultAdresse?.trim() || defaultPlz?.trim() || '').trim())
    setNotiz('')
    setMitarbeiterId('')
    setMailToggle(true)
  }

  async function save(sendMail: boolean) {
    if (!datum.trim()) {
      toast.error('Bitte Datum wählen.')
      return
    }
    if (istBesichtigung && !mitarbeiterId.trim()) {
      toast.error('Bitte Mitarbeiter für den Vor-Ort-Termin wählen.')
      return
    }
    if (sendMail && mailToggle && kontaktEmail?.trim() && istBesichtigung && !mitarbeiterId.trim()) {
      toast.error('Für die Bestätigungs-Mail ist ein Mitarbeiter nötig.')
      return
    }

    setSaving(true)

    if (istBesichtigung) {
      if (!von.trim()) {
        setSaving(false)
        toast.error('Bitte Uhrzeit wählen.')
        return
      }
      const res = await saveLeadTerminVereinbart({
        leadId,
        kontaktName: kontaktName?.trim() || 'Kundin/Kunde',
        kontaktEmail: kontaktEmail ?? null,
        datum,
        uhrzeit: von.trim(),
        adresse: adresse.trim() || null,
        notiz: notiz.trim() || null,
        zugewiesenAn: mitarbeiterId.trim(),
        uhrzeitBis: bis.trim() || null,
        mailSenden: sendMail && mailToggle && Boolean(mailDraft?.to.length || kontaktEmail?.trim()),
        mailTo: mailDraft?.to,
        mailCc: mailDraft?.cc,
        mailBetreff: mailDraft?.betreff,
        mailHtml: mailDraft?.html,
        mailBodyText: mailDraft?.bodyText,
      })
      if (!res.ok) {
        setSaving(false)
        toast.error(res.message)
        return
      }
      setSaving(false)
      toast.success(
        sendMail && mailToggle && kontaktEmail?.trim()
          ? 'Termin gespeichert und Bestätigung per E-Mail versendet.'
          : 'Termin gespeichert.'
      )
    } else {
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
        zugewiesen_an: null,
      })
      if (!res.ok) {
        setSaving(false)
        toast.error(res.message)
        return
      }
      setSaving(false)
      toast.success('Termin gespeichert.')
    }

    reset()
    onClose()
    onSaved?.()
  }

  const kontaktNameAnzeige = kontaktName?.trim() || 'Kundin/Kunde'
  const isMobile = useIsMobile()

  const formBody = (
    <>
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
        {istBesichtigung ? (
          <TerminMitarbeiterSelect
            team={team}
            value={mitarbeiterId}
            onChange={setMitarbeiterId}
            loading={teamLoading}
            required
          />
        ) : null}
        <label className="md:col-span-2">
          <span className="input-label">Notiz</span>
          <Textarea rows={3} value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="Notiz…" />
        </label>
      </div>

      {istBesichtigung ? (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={mailToggle} onChange={(e) => setMailToggle(e.target.checked)} />
            Bestätigungs-Mail an Kunden ({kontaktEmail ?? 'keine E-Mail'})
          </label>
          <TerminBestaetigungMailEditor
            active={mailToggle}
            leadId={leadId}
            kontaktEmail={kontaktEmail?.trim() ?? ''}
            kontaktName={kontaktNameAnzeige}
            datum={datum}
            uhrzeitVon={von}
            uhrzeitBis={bis.trim() || null}
            adresse={adresse.trim() || null}
            notiz={notiz.trim() || null}
            zugewiesenAn={mitarbeiterId}
            value={mailDraft}
            onChange={setMailDraft}
          />
        </div>
      ) : null}
    </>
  )

  const formFooter = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="secondary" onClick={onClose}>
        Abbrechen
      </Button>
      <Button type="button" variant="secondary" loading={saving} onClick={() => void save(false)}>
        Speichern ohne Mail
      </Button>
      {istBesichtigung && kontaktEmail?.trim() ? (
        <Button type="button" variant="primary" loading={saving} onClick={() => void save(true)}>
          Speichern + Mail
        </Button>
      ) : (
        <Button type="button" variant="primary" loading={saving} onClick={() => void save(false)}>
          Speichern
        </Button>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <FormSheet
        open={open}
        onClose={onClose}
        breadcrumb="Anfragen"
        title="Termin vereinbaren"
        footer={formFooter}
        width="lg"
      >
        {formBody}
      </FormSheet>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Termin vereinbaren" size="lg">
      {formBody}
      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-bw-border pt-4">{formFooter}</div>
    </Modal>
  )
}

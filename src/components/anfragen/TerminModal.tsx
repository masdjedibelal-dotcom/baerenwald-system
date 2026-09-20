'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'

import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { useEffect, useState } from 'react'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
import { Textarea } from '@/components/ui/Textarea'
>>>>>>> Stashed changes
import {
  insertKalenderTermin,
  loadCrmTeamFuerTermin,
  saveLeadTerminVereinbart,
} from '@/app/(dashboard)/anfragen/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import { toast } from '@/components/ui/app-toast'
import { DateInput } from '@/components/ui/DateInput'
import { FilterRangeRow } from '@/components/ui/FilterRangeRow'
import { TimeInput } from '@/components/ui/TimeInput'
import {
  TerminBestaetigungMailEditor,
  type TerminMailDraft,
} from '@/components/anfragen/TerminBestaetigungMailEditor'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import { KALENDER_TYP_LABEL } from '@/lib/kalender-styles'
import type { KalenderTermin } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

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
  /** HV-Kanäle: Bestätigungs-Mail standardmäßig aus */
  defaultMailOff?: boolean
  leadKanal?: string | null
}

function isHvKanal(kanal: string | null | undefined): boolean {
  const k = (kanal ?? '').trim().toLowerCase()
  return (
    k === 'hv_melder_link' ||
    k === 'hv_einladung' ||
    k === 'hv_direkt' ||
    k === 'hv_manuell' ||
    k.startsWith('hv_')
  )
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
  defaultMailOff,
  leadKanal,
}: Props) {
  const initialAdresse = (defaultAdresse?.trim() || defaultPlz?.trim() || '').trim()
  const mailOff =
    defaultMailOff === true || (defaultMailOff == null && isHvKanal(leadKanal))
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [typ, setTyp] = useState<KalenderTermin['typ']>(typFixed ?? 'besichtigung')
  const [datum, setDatum] = useState('')
  const [von, setVon] = useState('')
  const [bis, setBis] = useState('')
  const [adresse, setAdresse] = useState(initialAdresse)
  const [notiz, setNotiz] = useState('')
  const [mitarbeiterId, setMitarbeiterId] = useState('')
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [mailToggle, setMailToggle] = useState(!mailOff)
  const [mailDraft, setMailDraft] = useState<TerminMailDraft | null>(null)
  const [saving, setSaving] = useState(false)

  const istBesichtigung = (typFixed ?? typ) === 'besichtigung'

  useEffect(() => {
    if (!open) return
    setAdresse((defaultAdresse?.trim() || defaultPlz?.trim() || '').trim())
    setMailToggle(!(defaultMailOff === true || (defaultMailOff == null && isHvKanal(leadKanal))))
    setMailDraft(null)
    clearFieldErrors()
    setTeamLoading(true)
    void loadCrmTeamFuerTermin()
      .then((list) => setTeam(list))
      .finally(() => setTeamLoading(false))
  }, [open, defaultAdresse, defaultPlz, defaultMailOff, leadKanal, clearFieldErrors])

  function reset() {
    setTyp('besichtigung')
    setDatum('')
    setVon('')
    setBis('')
    setAdresse((defaultAdresse?.trim() || defaultPlz?.trim() || '').trim())
    setNotiz('')
    setMitarbeiterId('')
    setMailToggle(!(defaultMailOff === true || (defaultMailOff == null && isHvKanal(leadKanal))))
    clearFieldErrors()
  }

  async function save(sendMail: boolean) {
    if (!datum.trim()) {
      applyFieldErrors({ datum: 'Bitte Datum wählen.' })
      return
    }
    if (istBesichtigung && !mitarbeiterId.trim()) {
      applyFieldErrors({ mitarbeiterId: 'Bitte Mitarbeiter für den Vor-Ort-Termin wählen.' })
      return
    }
    if (sendMail && mailToggle && kontaktEmail?.trim() && istBesichtigung && !mitarbeiterId.trim()) {
      applyFieldErrors({ mitarbeiterId: TOAST.fuer_die_bestaetigungs_mail_ist_ein_mitarbeiter })
      return
    }

    setSaving(true)

    if (istBesichtigung) {
      if (!von.trim()) {
        setSaving(false)
        applyFieldErrors({ von: 'Bitte Uhrzeit wählen.' })
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
        toast.systemError(res)
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
        toast.systemError(res)
        return
      }
      setSaving(false)
      toast.success(TOAST.termin_gespeichert_2)
    }

    reset()
    onClose()
    onSaved?.()
  }

  const kontaktNameAnzeige = kontaktName?.trim() || 'Kundin/Kunde'

  const formBody = (
    <>
      {fieldErrors._form ? (
        <p className="field-error mb-3" role="alert">
          {fieldErrors._form}
        </p>
      ) : null}
      <div className="form-grid-2 grid gap-3 md:grid-cols-2">
        {typFixed ? null : (
          <label className="md:col-span-1">
            <span className="input-label">Typ</span>
            <MockSelect value={typ} onChange={(e) => setTyp(e.target.value as KalenderTermin['typ'])}>
              {TYP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </MockSelect>
          </label>
        )}
        <MockField label="Datum" required full name="datum" error={fieldErrors.datum} className="md:col-span-2">
          <DateInput
            size="sm"
            value={datum}
            onChange={(e) => {
              clearField('datum')
              setDatum(e.target.value)
            }}
            required
          />
        </MockField>
        <div className="md:col-span-2">
          <FilterRangeRow
            title="Uhrzeit"
            className="!mb-0"
            von={
              <TimeInput
                size="sm"
                value={von}
                onChange={(e) => {
                  clearField('von')
                  setVon(e.target.value)
                }}
                aria-invalid={Boolean(fieldErrors.von)}
              />
            }
            bis={
              <TimeInput size="sm" value={bis} onChange={(e) => setBis(e.target.value)} />
            }
          />
          {fieldErrors.von ? (
            <p className="field-error" role="alert">
              {fieldErrors.von}
            </p>
          ) : null}
        </div>
        <label className="md:col-span-2">
          <span className="input-label">Adresse</span>
          <MockInput type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </label>
        {istBesichtigung ? (
          <div className="md:col-span-2" data-field="mitarbeiterId">
            <TerminMitarbeiterSelect
              team={team}
              value={mitarbeiterId}
              onChange={(v) => {
                clearField('mitarbeiterId')
                setMitarbeiterId(v)
              }}
              loading={teamLoading}
              required
            />
            {fieldErrors.mitarbeiterId ? (
              <p className="field-error" role="alert">
                {fieldErrors.mitarbeiterId}
              </p>
            ) : null}
          </div>
        ) : null}
        <label className="md:col-span-2">
          <span className="input-label">Notiz</span>
          <RichTextEditor value={typeof (notiz) === 'string' ? (notiz) : ''} onChange={(__v) => setNotiz(__v)} placeholder="Notiz…" minHeight={120} aria-label="Notiz…" />
        </label>
      </div>

      {istBesichtigung ? (
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-[length:var(--fs-text)]">
            <MockCheckbox checked={mailToggle} onChange={(e) => setMailToggle(e.target.checked)} />
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
      <MockBtn type="button" kind="secondary" loading={saving} onClick={() => void save(false)}>
        Ohne Mail
      </MockBtn>
      {istBesichtigung && kontaktEmail?.trim() ? (
        <MockBtn type="button" kind="primary" loading={saving} onClick={() => void save(true)}>
          Speichern + Mail
        </MockBtn>
      ) : (
        <MockBtn type="button" kind="primary" loading={saving} onClick={() => void save(false)}>
          Speichern
        </MockBtn>
      )}
    </div>
  )

  return (
    <EditorSheet open={open} onClose={onClose} title="Termin" context="detail" size="lg">
      {formBody}
      <div className="mt-4 border-t border-[var(--app-separator)] pt-3">{formFooter}</div>
    </EditorSheet>
  )
}

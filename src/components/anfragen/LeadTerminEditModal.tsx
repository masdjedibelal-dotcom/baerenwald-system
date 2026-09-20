'use client'

import { MockInput } from '@/components/mock-ui/MockForm'
import { useEffect, useState } from 'react'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { loadCrmTeamFuerTermin } from '@/app/(dashboard)/anfragen/actions'
import { saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import { toast } from '@/components/ui/app-toast'
import { DateInput } from '@/components/ui/DateInput'
import { FilterRangeRow } from '@/components/ui/FilterRangeRow'
import { TimeInput } from '@/components/ui/TimeInput'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { KalenderTermin } from '@/lib/types'
import { TOAST } from '@/lib/copy'
import { useFieldErrors } from '@/lib/validation/form-schema'

type Props = {
  open: boolean
  onClose: () => void
  termin: KalenderTermin
  onSaved: () => void
}

export function LeadTerminEditModal({ open, onClose, termin, onSaved }: Props) {
  const { fieldErrors, applyFieldErrors, clearFieldErrors, clearField } = useFieldErrors()
  const [datum, setDatum] = useState(termin.datum)
  const [von, setVon] = useState(termin.uhrzeit_von?.slice(0, 5) ?? '')
  const [bis, setBis] = useState(termin.uhrzeit_bis?.slice(0, 5) ?? '')
  const [adresse, setAdresse] = useState(termin.adresse?.trim() ?? '')
  const [mitarbeiterId, setMitarbeiterId] = useState(termin.zugewiesen_an ?? '')
  const [team, setTeam] = useState<CrmTeamMitglied[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const istBesichtigung = termin.typ === 'besichtigung'

  useEffect(() => {
    if (!open) return
    setDatum(termin.datum)
    setVon(termin.uhrzeit_von?.slice(0, 5) ?? '')
    setBis(termin.uhrzeit_bis?.slice(0, 5) ?? '')
    setAdresse(termin.adresse?.trim() ?? '')
    setMitarbeiterId(termin.zugewiesen_an ?? '')
    setTeamLoading(true)
    void loadCrmTeamFuerTermin()
      .then((list) => setTeam(list))
      .finally(() => setTeamLoading(false))
  }, [open, termin])

  async function speichern() {
    if (!datum.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_datum_waehlen })
      return
    }
    if (istBesichtigung && !mitarbeiterId.trim()) {
      applyFieldErrors({ _form: TOAST.bitte_mitarbeiter_waehlen })
      return
    }
    setSaving(true)
    const res = await saveKalenderTermin({
      id: termin.id,
      titel: termin.titel,
      typ: termin.typ,
      datum: datum.trim(),
      uhrzeit_von: von.trim() || null,
      uhrzeit_bis: bis.trim() || null,
      adresse: adresse.trim() || null,
      beschreibung: termin.beschreibung,
      lead_id: termin.lead_id,
      auftrag_id: termin.auftrag_id,
      zugewiesen_an: istBesichtigung ? mitarbeiterId.trim() : termin.zugewiesen_an,
      erledigt: termin.erledigt,
    })
    setSaving(false)
    if (!res.ok) {
      toast.systemError(res)
      return
    }
    toast.success(TOAST.termin_gespeichert)
    onClose()
    onSaved()
  }

  return (
    <EditorSheet
      open={open}
      onClose={onClose}
      title="Termin"
      context="detail"
      confirmBusy={saving}
      onConfirm={() => void speichern()}
    >
      <div className="form-grid-2 grid gap-3 md:grid-cols-2">
        {fieldErrors._form ? <p className="field-error" role="alert">{fieldErrors._form}</p> : null}
        
        <label className="md:col-span-2">
          <span className="input-label">Datum</span>
          <DateInput size="sm" value={datum} onChange={(e) => setDatum(e.target.value)} required />
        </label>
        <div className="md:col-span-2">
          <FilterRangeRow
            title="Uhrzeit"
            className="!mb-0"
            von={
              <TimeInput size="sm" value={von} onChange={(e) => setVon(e.target.value)} />
            }
            bis={
              <TimeInput size="sm" value={bis} onChange={(e) => setBis(e.target.value)} />
            }
          />
        </div>
        <label className="md:col-span-2">
          <span className="input-label">Adresse</span>
          <MockInput type="text" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Ort" />
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
      </div>
    </EditorSheet>
  )
}

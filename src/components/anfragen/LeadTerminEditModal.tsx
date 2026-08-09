'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ModalFormFooter } from '@/components/ui/ModalFormFooter'
import { loadCrmTeamFuerTermin } from '@/app/(dashboard)/anfragen/actions'
import { saveKalenderTermin } from '@/app/(dashboard)/kalender/actions'
import { TerminMitarbeiterSelect } from '@/components/anfragen/TerminMitarbeiterSelect'
import { toast } from '@/components/ui/app-toast'
import type { CrmTeamMitglied } from '@/lib/crm-team'
import type { KalenderTermin } from '@/lib/types'

type Props = {
  open: boolean
  onClose: () => void
  termin: KalenderTermin
  onSaved: () => void
}

export function LeadTerminEditModal({ open, onClose, termin, onSaved }: Props) {
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
      toast.error('Bitte Datum wählen.')
      return
    }
    if (istBesichtigung && !mitarbeiterId.trim()) {
      toast.error('Bitte Mitarbeiter wählen.')
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
      toast.error(res.message)
      return
    }
    toast.success('Termin gespeichert')
    onClose()
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Termin bearbeiten" size="md">
      <div className="form-grid-2 grid gap-3 md:grid-cols-2">
        <label>
          <span className="input-label">Datum</span>
          <input
            type="date"
            className="input"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            required
          />
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
          <input
            type="text"
            className="input"
            value={adresse}
            onChange={(e) => setAdresse(e.target.value)}
            placeholder="Ort des Termins"
          />
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
      <ModalFormFooter
        onCancel={onClose}
        onSubmit={() => void speichern()}
        submitLabel="Speichern"
        loading={saving}
      />
    </Modal>
  )
}

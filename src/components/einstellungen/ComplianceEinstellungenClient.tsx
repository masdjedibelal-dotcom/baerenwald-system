'use client'
import { MockCheckbox } from '@/components/mock-ui/MockCheckbox'
import { MockBtn } from '@/components/mock-ui'
import { MockField, MockInput, MockSelect } from '@/components/mock-ui/MockForm'
import { EditorSheet } from '@/components/surfaces/EditorSheet'
import { RichTextEditor } from '@/components/ui/RichTextEditor'
import { useLocalTransition } from '@/components/ui/action-busy'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
<<<<<<< Updated upstream
=======
import { MockBtn } from '@/components/mock-ui'
>>>>>>> Stashed changes
import {
  EinstellungenListBody,
  EinstellungenListItem,
  EinstellungenListMeta,
} from '@/components/einstellungen/EinstellungenUi'
import { toast } from '@/components/ui/app-toast'
import {
  createComplianceTyp,
  loadComplianceTypen,
  updateComplianceTyp,
  type ComplianceTypRow,
} from '@/app/(dashboard)/einstellungen/compliance/actions'
import { TOAST } from '@/lib/copy'

export function ComplianceEinstellungenClient({ initial }: { initial: ComplianceTypRow[] }) {
  const [rows, setRows] = useState(initial)
  const [modal, setModal] = useState(false)
  const [bez, setBez] = useState('')
  const [besch, setBesch] = useState('')
  const [monate, setMonate] = useState('')
  const [pflicht, setPflicht] = useState(true)
  const [kategorieNeu, setKategorieNeu] = useState('')
  const [pending, startTransition] = useLocalTransition()

  async function patchRow(id: string, patch: Partial<ComplianceTypRow>) {
    const r = await updateComplianceTyp(id, patch)
    if (!r.ok) {
      toast.systemError(r)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  function create() {
    startTransition(async () => {
      const m = monate.trim() ? parseInt(monate, 10) : null
      const r = await createComplianceTyp({
        bezeichnung: bez,
        beschreibung: besch.trim() || null,
        erneuerung_monate: m != null && Number.isFinite(m) ? m : null,
        pflicht_fuer_fachbetriebe: pflicht,
        kategorie: kategorieNeu.trim() || null,
      })
      if (!r.ok) {
        toast.systemError(r)
        return
      }
      toast.success(TOAST.angelegt)
      setModal(false)
      setBez('')
      setBesch('')
      setMonate('')
      setKategorieNeu('')
      const fresh = await loadComplianceTypen()
      setRows(fresh)
      
    })
  }

  return (
    <div className="space-y-4">
      <Card
        title="Compliance-Dokumenttypen"
        className="einst-list"
        action={
          <MockBtn type="button" kind="primary" className="sm" onClick={() => setModal(true)}>
            + Neuer Typ
          </MockBtn>
        }
      >
        <EinstellungenListBody empty={rows.length === 0 ? 'Noch keine Dokumenttypen.' : undefined}>
          {rows.map((t) => (
            <EinstellungenListItem key={t.id} className="einst-list-item--stack">
              <div>
                <p className="einst-list-title">{t.bezeichnung}</p>
                <EinstellungenListMeta>
                  {[
                    t.compliance_ebene === 'meister'
                      ? 'Meister & Fachbetrieb'
                      : t.compliance_ebene === 'leistung'
                        ? 'Leistungsvertrag'
                        : 'Allgemein',
                    t.nur_bei_bauleistung ? 'nur Bauleistung' : null,
                    t.beschreibung,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </EinstellungenListMeta>
              </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <MockField label="Bezeichnung"><MockInput defaultValue={t.bezeichnung} key={`bez-${t.id}-${t.bezeichnung}`} onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (!v || v === t.bezeichnung.trim()) return
                  void patchRow(t.id, { bezeichnung: v })
                }} /></MockField>
              <MockField label="Kategorie (Gruppe)"><MockInput defaultValue={t.kategorie ?? ''} key={`kat-${t.id}-${t.kategorie ?? ''}`} placeholder="z. B. Bauprojekt, Individuell…" onBlur={(e) => {
                  const v = e.target.value.trim()
                  const cur = (t.kategorie ?? '').trim()
                  if (v === cur) return
                  void patchRow(t.id, { kategorie: v || null })
                }} /></MockField>
            </div>
            <div className="mb-3 max-w-2xl">
              <MockField label="Beschreibung"><RichTextEditor value="" minHeight={120} aria-label="Beschreibung" onChange={() => {}} /></MockField>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-bw-text-muted">Ebene</span>
                <MockSelect className="w-full py-1.5 text-sm" value={t.compliance_ebene ?? 'allgemein'} onChange={(e) =>
                    void patchRow(t.id, {
                      compliance_ebene: e.target.value as ComplianceTypRow['compliance_ebene'],
                    })}>
                  <option value="allgemein">Allgemein (alle Partner)</option>
                  <option value="meister">Meister & Fachbetrieb</option>
                  <option value="leistung">Leistungsvertrag & Auftrag</option>
                </MockSelect>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <MockCheckbox
                  checked={t.nur_bei_bauleistung}
                  onChange={(e) => void patchRow(t.id, { nur_bei_bauleistung: e.target.checked })}
                />
                Nur bei Bauleistung
              </label>
              <label className="flex items-center gap-2">
                <MockCheckbox
                  checked={t.pflicht_fuer_fachbetriebe}
                  onChange={(e) => void patchRow(t.id, { pflicht_fuer_fachbetriebe: e.target.checked })}
                />
                Pflicht (Partner)
              </label>
              <label className="flex items-center gap-2">
                <MockCheckbox
                  checked={t.pflicht_bauprojekt}
                  onChange={(e) => void patchRow(t.id, { pflicht_bauprojekt: e.target.checked })}
                />
                Pflicht (Bauprojekt)
              </label>
              <label className="flex items-center gap-2">
                <MockCheckbox
                  checked={t.mehrfach_erlaubt}
                  onChange={(e) => void patchRow(t.id, { mehrfach_erlaubt: e.target.checked })}
                />
                Mehrfach
              </label>
              <label className="flex items-center gap-2">
                <MockCheckbox
                  checked={t.aktiv}
                  onChange={(e) => void patchRow(t.id, { aktiv: e.target.checked })}
                />
                Aktiv
              </label>
              <div className="flex items-center gap-2">
                <span className="text-bw-text-muted">Frist (Monate)</span>
                <MockInput type="number" min={0} className="w-24 py-1 text-sm" defaultValue={t.erneuerung_monate ?? ''} key={`${t.id}-${t.erneuerung_monate}`} onBlur={(e) => {
                    const v = e.target.value.trim()
                    const n = v === '' ? null : parseInt(v, 10)
                    if (v !== '' && !Number.isFinite(n)) return
                    if (n === t.erneuerung_monate || (n == null && t.erneuerung_monate == null)) return
                    void patchRow(t.id, { erneuerung_monate: n })
                  }} />
              </div>
            </div>
            </EinstellungenListItem>
          ))}
        </EinstellungenListBody>
      </Card>

      <EditorSheet
        open={modal}
        onClose={() => setModal(false)}
        title="Neuer Dokument-Typ"
<<<<<<< Updated upstream
        secondary={{ label: 'Abbrechen', onClick: () => setModal(false), kind: 'ghost' }}
        primary={{
          label: 'Speichern',
          onClick: () => create(),
          busy: pending,
        }}
=======
        footer={
          <div className="flex justify-end gap-2">
            <MockBtn type="button" kind="ghost" onClick={() => setModal(false)}>
              Abbrechen
            </MockBtn>
            <MockBtn type="button" kind="primary" loading={pending} onClick={() => create()}>
              Speichern
            </MockBtn>
          </div>
        }
>>>>>>> Stashed changes
      >
        <div className="space-y-3">
          <MockField label="Bezeichnung" required><MockInput required value={bez} onChange={(e) => setBez(e.target.value)} /></MockField>
          <MockField label="Beschreibung"><RichTextEditor value={typeof (besch) === 'string' ? (besch) : ''} onChange={(__v) => setBesch(__v)} minHeight={120} aria-label="Beschreibung" /></MockField>
          <MockField label="Frist Monate (optional)"><MockInput type="number" min={0} value={monate} onChange={(e) => setMonate(e.target.value)} /></MockField>
          <MockField label="Kategorie (optional)"><MockInput value={kategorieNeu} onChange={(e) => setKategorieNeu(e.target.value)} placeholder="Gruppierung in der Compliance-Liste" /></MockField>
          <label className="flex items-center gap-2 text-sm">
            <MockCheckbox checked={pflicht} onChange={(e) => setPflicht(e.target.checked)} />
            Pflicht für Fachbetriebe
          </label>
        </div>
      </EditorSheet>
    </div>
  )
}

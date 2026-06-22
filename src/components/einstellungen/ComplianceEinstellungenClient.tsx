'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EinstellungenListBody, EinstellungenListMeta } from '@/components/einstellungen/EinstellungenUi'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/components/ui/app-toast'
import {
  createComplianceTyp,
  loadComplianceTypen,
  updateComplianceTyp,
  type ComplianceTypRow,
} from '@/app/(dashboard)/einstellungen/compliance/actions'
import { useRouter } from 'next/navigation'

export function ComplianceEinstellungenClient({ initial }: { initial: ComplianceTypRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [modal, setModal] = useState(false)
  const [bez, setBez] = useState('')
  const [besch, setBesch] = useState('')
  const [monate, setMonate] = useState('')
  const [pflicht, setPflicht] = useState(true)
  const [kategorieNeu, setKategorieNeu] = useState('')
  const [pending, startTransition] = useTransition()

  async function patchRow(id: string, patch: Partial<ComplianceTypRow>) {
    const r = await updateComplianceTyp(id, patch)
    if (!r.ok) {
      toast.error(r.message)
      return
    }
    setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    router.refresh()
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
        toast.error(r.message)
        return
      }
      toast.success('Angelegt')
      setModal(false)
      setBez('')
      setBesch('')
      setMonate('')
      setKategorieNeu('')
      const fresh = await loadComplianceTypen()
      setRows(fresh)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <Card
        title="Compliance-Dokumenttypen"
        action={
          <Button type="button" variant="primary" className="btn-sm" onClick={() => setModal(true)}>
            + Neuer Typ
          </Button>
        }
      >
        <EinstellungenListBody empty={rows.length === 0 ? 'Noch keine Dokumenttypen.' : undefined}>
          {rows.map((t) => (
            <li key={t.id} className="space-y-3 py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-[13.5px] font-medium text-bw-text">{t.bezeichnung}</p>
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
              <Input
                label="Bezeichnung"
                defaultValue={t.bezeichnung}
                key={`bez-${t.id}-${t.bezeichnung}`}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (!v || v === t.bezeichnung.trim()) return
                  void patchRow(t.id, { bezeichnung: v })
                }}
              />
              <Input
                label="Kategorie (Gruppe)"
                defaultValue={t.kategorie ?? ''}
                key={`kat-${t.id}-${t.kategorie ?? ''}`}
                placeholder="z. B. Bauprojekt, Individuell…"
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  const cur = (t.kategorie ?? '').trim()
                  if (v === cur) return
                  void patchRow(t.id, { kategorie: v || null })
                }}
              />
            </div>
            <div className="mb-3 max-w-2xl">
              <Textarea
                label="Beschreibung"
                defaultValue={t.beschreibung ?? ''}
                key={`besch-${t.id}-${t.beschreibung ?? ''}`}
                rows={2}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  const cur = (t.beschreibung ?? '').trim()
                  if (v === cur) return
                  void patchRow(t.id, { beschreibung: v || null })
                }}
              />
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-bw-text-muted">Ebene</span>
                <select
                  className="input w-full py-1.5 text-sm"
                  value={t.compliance_ebene ?? 'allgemein'}
                  onChange={(e) =>
                    void patchRow(t.id, {
                      compliance_ebene: e.target.value as ComplianceTypRow['compliance_ebene'],
                    })
                  }
                >
                  <option value="allgemein">Allgemein (alle Partner)</option>
                  <option value="meister">Meister & Fachbetrieb</option>
                  <option value="leistung">Leistungsvertrag & Auftrag</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.nur_bei_bauleistung}
                  onChange={(e) => void patchRow(t.id, { nur_bei_bauleistung: e.target.checked })}
                />
                Nur bei Bauleistung
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.pflicht_fuer_fachbetriebe}
                  onChange={(e) => void patchRow(t.id, { pflicht_fuer_fachbetriebe: e.target.checked })}
                />
                Pflicht (Partner)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.pflicht_bauprojekt}
                  onChange={(e) => void patchRow(t.id, { pflicht_bauprojekt: e.target.checked })}
                />
                Pflicht (Bauprojekt)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.mehrfach_erlaubt}
                  onChange={(e) => void patchRow(t.id, { mehrfach_erlaubt: e.target.checked })}
                />
                Mehrfach
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.aktiv}
                  onChange={(e) => void patchRow(t.id, { aktiv: e.target.checked })}
                />
                Aktiv
              </label>
              <div className="flex items-center gap-2">
                <span className="text-bw-text-muted">Frist (Monate)</span>
                <input
                  type="number"
                  min={0}
                  className="input w-24 py-1 text-sm"
                  defaultValue={t.erneuerung_monate ?? ''}
                  key={`${t.id}-${t.erneuerung_monate}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    const n = v === '' ? null : parseInt(v, 10)
                    if (v !== '' && !Number.isFinite(n)) return
                    if (n === t.erneuerung_monate || (n == null && t.erneuerung_monate == null)) return
                    void patchRow(t.id, { erneuerung_monate: n })
                  }}
                />
              </div>
            </div>
            </li>
          ))}
        </EinstellungenListBody>
      </Card>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Neuer Dokument-Typ"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>
              Abbrechen
            </Button>
            <Button type="button" variant="primary" loading={pending} onClick={() => create()}>
              Speichern
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input label="Bezeichnung" required value={bez} onChange={(e) => setBez(e.target.value)} />
          <Textarea label="Beschreibung" value={besch} onChange={(e) => setBesch(e.target.value)} rows={3} />
          <Input
            label="Frist Monate (optional)"
            type="number"
            min={0}
            value={monate}
            onChange={(e) => setMonate(e.target.value)}
          />
          <Input
            label="Kategorie (optional)"
            value={kategorieNeu}
            onChange={(e) => setKategorieNeu(e.target.value)}
            placeholder="Gruppierung in der Compliance-Liste"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pflicht} onChange={(e) => setPflicht(e.target.checked)} />
            Pflicht für Fachbetriebe
          </label>
        </div>
      </Modal>
    </div>
  )
}

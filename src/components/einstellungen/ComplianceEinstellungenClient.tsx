'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
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
      const fresh = await loadComplianceTypen()
      setRows(fresh)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={() => setModal(true)}>
          + Neuer Dokument-Typ
        </Button>
      </div>
      <div className="space-y-3">
        {rows.map((t) => (
          <Card key={t.id} title={t.bezeichnung}>
            <p className="mb-3 text-sm text-bw-light">{t.beschreibung ?? '—'}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.pflicht_fuer_fachbetriebe}
                  onChange={(e) => void patchRow(t.id, { pflicht_fuer_fachbetriebe: e.target.checked })}
                />
                Pflicht
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
          </Card>
        ))}
      </div>

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
          <div>
            <label className="input-label">Beschreibung</label>
            <textarea className="input min-h-[80px]" value={besch} onChange={(e) => setBesch(e.target.value)} />
          </div>
          <Input
            label="Frist Monate (optional)"
            type="number"
            min={0}
            value={monate}
            onChange={(e) => setMonate(e.target.value)}
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

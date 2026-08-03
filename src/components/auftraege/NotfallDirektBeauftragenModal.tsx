'use client'
import { useTransition } from '@/components/ui/action-busy'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { toast } from '@/components/ui/app-toast'
import { notfallDirektBeauftragen } from '@/app/(dashboard)/auftraege/notfall-direkt-actions'
import { listHandwerkerAuswahlFuerGewerk } from '@/app/(dashboard)/auftraege/handwerker-actions'
import type { HandwerkerGewerkListeEintrag } from '@/app/(dashboard)/angebote/actions'

/**
 * Phase 9 / Spec §10: Notfall-Direktauftrag — nur Aufwand, ohne Cap-UI, ohne Festpreis-Zweig.
 * Felder: Handwerker · Stundensatz + Materialaufschlag · Leistungsumfang · Beauftragen.
 */
export function NotfallDirektBeauftragenModal({
  open,
  onClose,
  auftragId,
  leadId,
  gewerkName,
  variant = 'auftrag',
  onDone,
}: {
  open: boolean
  onClose: () => void
  auftragId?: string | null
  leadId?: string | null
  gewerkName?: string | null
  /** anfrage = „Notfall melden“ (legt Auftrag an); auftrag = bestehende Direkt-Beauftragung */
  variant?: 'auftrag' | 'anfrage'
  onDone?: (auftragId: string) => void
}) {
  const [pending, startTransition] = useTransition()
  const [handwerker, setHandwerker] = useState<HandwerkerGewerkListeEintrag[]>([])
  const [hwId, setHwId] = useState('')
  const [stundensatz, setStundensatz] = useState('')
  const [materialaufschlag, setMaterialaufschlag] = useState('')
  const [leistungsumfang, setLeistungsumfang] = useState('')

  const fromAnfrage = variant === 'anfrage'
  const title = 'Direkt beauftragen'
  const gewerkLabel = gewerkName?.trim() || 'Gewerk'

  useEffect(() => {
    if (!open) return
    setStundensatz('')
    setMaterialaufschlag('')
    setLeistungsumfang('')
    void listHandwerkerAuswahlFuerGewerk({}).then((r) => {
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      const list = [...r.empfohlen, ...r.alle]
      setHandwerker(list)
      if (list[0]?.id) setHwId((prev) => prev || list[0]!.id)
    })
  }, [open])

  if (!open) return null

  function submit() {
    if (!hwId) {
      toast.error('Bitte Handwerker wählen.')
      return
    }
    const satzNum = stundensatz.trim() ? Number(stundensatz.replace(',', '.')) : NaN
    if (!Number.isFinite(satzNum) || satzNum <= 0) {
      toast.error('Bitte Stundensatz angeben.')
      return
    }
    const matRaw = materialaufschlag.trim()
    const matNum = matRaw ? Number(matRaw.replace(',', '.')) : 0
    if (matRaw && (!Number.isFinite(matNum) || matNum < 0)) {
      toast.error('Materialaufschlag ungültig.')
      return
    }
    const bullets = leistungsumfang
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)

    startTransition(async () => {
      const r = await notfallDirektBeauftragen({
        auftragId,
        leadId,
        handwerkerId: hwId,
        verguetung: 'aufwand',
        betragNetto: satzNum,
        materialaufschlagPct: matNum > 0 ? matNum : null,
        leistungsumfang: bullets,
        gewerkName: gewerkName ?? 'Allgemein',
      })
      if (!r.ok) {
        toast.error(r.message)
        return
      }
      toast.success(fromAnfrage ? 'Direktauftrag angelegt' : 'Direkt beauftragt — nach Aufwand')
      onClose()
      onDone?.(r.auftragId)
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="space-y-4 p-1">
        <p className="text-[length:var(--fs-text)] text-bw-text-muted">
          {fromAnfrage
            ? `Direktauftrag ohne Angebot: Einsatz [${gewerkLabel}] als Position nach Aufwand. Stunden später über Bautagebuch → Rechnung.`
            : `Direktauftrag ohne Angebot mit Position nach Aufwand („Einsatz [${gewerkLabel}]“). Festpreis läuft über Angebot annehmen.`}
        </p>

        <label className="block text-[length:var(--fs-meta)] font-medium text-bw-text">
          Handwerker zuordnen
          <select
            className="mt-1 w-full rounded-md border border-bw-border bg-white px-3 py-2 text-[length:var(--fs-text)]"
            value={hwId}
            onChange={(e) => setHwId(e.target.value)}
          >
            <option value="">— wählen —</option>
            {handwerker.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.firma ? ` · ${h.firma}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-md border border-bw-border bg-bw-surface-2/40 px-3 py-2.5">
          <p className="mb-2 text-[length:var(--fs-meta)] font-semibold text-bw-text">Vergütung nach Aufwand</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Stundensatz netto (€)"
              inputMode="decimal"
              value={stundensatz}
              onChange={(e) => setStundensatz(e.target.value)}
              placeholder="z. B. 85"
              autoFocus
            />
            <Input
              label="Materialaufschlag (%)"
              inputMode="decimal"
              value={materialaufschlag}
              onChange={(e) => setMaterialaufschlag(e.target.value)}
              placeholder="optional, z. B. 15"
            />
          </div>
        </div>

        <Textarea
          label="Leistungsumfang (Stichpunkte)"
          plain
          rows={4}
          value={leistungsumfang}
          onChange={(e) => setLeistungsumfang(e.target.value)}
          placeholder={'Eine Zeile pro Punkt\nz. B. Leckage abdichten\nz. B. Trocknung vorbereiten'}
        />

        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" onClick={submit} loading={pending}>
            Beauftragen
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Abbrechen
          </Button>
        </div>
      </div>
    </Modal>
  )
}

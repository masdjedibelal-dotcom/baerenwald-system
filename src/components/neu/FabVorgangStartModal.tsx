'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PickerSheet } from '@/components/surfaces/PickerSheet'
import { KundePickerSheet } from '@/components/kunden/KundePickerSheet'
import { KundeModal } from '@/components/kunden/KundeModal'
import { toast } from '@/components/ui/app-toast'
import {
  listAuftraegeFuerKunde,
  type FabKundeAuftragZeile,
} from '@/app/(dashboard)/neu/fab-neu-actions'
import { formatDatum } from '@/lib/utils'
import type { Kunde } from '@/lib/types'
import { fachbegriff } from '@/lib/crm/fachbegriffe'

export type FabVorgangArt = 'anfrage' | 'angebot' | 'rechnung'

/**
 * FAB-Zwischenschritt auf der aktuellen Seite (kein weißer `/neu`-Host).
 * Anfrage: direkt Funnel.
 * Angebot / Rechnung: KundePicker → danach Wizard-URL.
 */
export function FabVorgangStartModal({
  open,
  art,
  onClose,
  initialKundeId,
}: {
  open: boolean
  art: FabVorgangArt | null
  onClose: () => void
  initialKundeId?: string | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kundeId, setKundeId] = useState<string | null>(null)
  const [step, setStep] = useState<1 | 2>(1)
  const [auftraege, setAuftraege] = useState<FabKundeAuftragZeile[]>([])
  const [loadingAuftraege, setLoadingAuftraege] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  useEffect(() => {
    if (!open || art !== 'anfrage') return
    const kid = initialKundeId?.trim()
    router.push(kid ? `/anfragen/neu?kunde_id=${encodeURIComponent(kid)}` : '/anfragen/neu')
    onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur bei open/art/kunde
  }, [open, art, initialKundeId, router])

  useEffect(() => {
    if (!open || !art || art === 'anfrage') return
    const kid = initialKundeId?.trim() || null
    setKundeId(kid)
    setAuftraege([])
    setCreateOpen(false)
    if (art === 'rechnung' && kid) {
      setStep(2)
      setLoadingAuftraege(true)
      startTransition(async () => {
        const r = await listAuftraegeFuerKunde(kid)
        setLoadingAuftraege(false)
        if (!r.ok) {
          toast.error(r.message)
          setStep(1)
          return
        }
        setAuftraege(r.auftraege)
      })
      return
    }
    setStep(1)
    setLoadingAuftraege(false)
  }, [open, art, initialKundeId])

  if (!art || art === 'anfrage') return null

  function startAngebot(kid: string) {
    onClose()
    router.push(`/angebote/neu?kunde_id=${encodeURIComponent(kid)}`)
  }

  function startRechnung(withAuftragId: string | null, kid = kundeId) {
    if (!kid) {
      toast.error('Kunde wählen.')
      return
    }
    onClose()
    if (withAuftragId) {
      router.push(
        `/rechnungen/neu?kunde_id=${encodeURIComponent(kid)}&auftrag_id=${encodeURIComponent(withAuftragId)}&neu=1`
      )
      return
    }
    router.push(`/rechnungen/neu?kunde_id=${encodeURIComponent(kid)}`)
  }

  function onKundePick(k: Kunde) {
    setKundeId(k.id)
    if (art === 'angebot') {
      startAngebot(k.id)
      return
    }
    startRechnung(null, k.id)
  }

  const kundeVorausgewaehlt = Boolean(initialKundeId?.trim())
  const pickerTitle = art === 'angebot' ? 'Angebot' : 'Rechnung'

  return (
    <>
      <KundePickerSheet
        open={open && step === 1 && !createOpen}
        onClose={() => !pending && onClose()}
        title={pickerTitle}
        context="canvas"
        onNeu={() => setCreateOpen(true)}
        onPick={onKundePick}
      />

      {art === 'rechnung' ? (
        <PickerSheet
          open={open && step === 2 && !createOpen}
          onClose={() => {
            if (pending) return
            if (!kundeVorausgewaehlt) {
              setStep(1)
              return
            }
            onClose()
          }}
          title="Vorgang"
          context="canvas"
          empty={loadingAuftraege ? <p className="picker-sheet__empty">Lädt…</p> : undefined}
        >
          <ul className="picker-sheet__rows">
            <li>
              <button type="button" className="picker-sheet__row" onClick={() => startRechnung(null)}>
                <span className="picker-sheet__row-title">Ohne Vorgang</span>
                <span className="picker-sheet__row-meta" title={fachbegriff('ohne_vorgang')}>
                  Direktrechnung
                </span>
              </button>
            </li>
            {auftraege.map((a) => (
              <li key={a.id}>
                <button type="button" className="picker-sheet__row" onClick={() => startRechnung(a.id)}>
                  <span className="picker-sheet__row-title">
                    {a.titel?.trim() || `Auftrag ${a.id.slice(0, 8).toUpperCase()}`}
                  </span>
                  <span className="picker-sheet__row-meta">
                    {a.status}
                    {a.created_at ? ` · ${formatDatum(a.created_at)}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PickerSheet>
      ) : null}

      <KundeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        stayOnPage
        onSaved={(id) => {
          setCreateOpen(false)
          if (!id) return
          if (art === 'angebot') startAngebot(id)
          else startRechnung(null, id)
        }}
      />
    </>
  )
}

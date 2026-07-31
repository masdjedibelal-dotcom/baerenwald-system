'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KundeModal } from '@/components/kunden/KundeModal'
import { PartnerCreateSheet } from '@/components/handwerker/PartnerCreateSheet'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { KalenderTerminEditorSheet } from '@/components/kalender/KalenderTerminEditorSheet'
import { TodoEditorSheet } from '@/components/todos/TodoEditorSheet'
import { AnfrageWizard } from '@/components/anfragen/AnfrageWizard'
import { listGewerkeFuerFab } from '@/app/(dashboard)/neu/fab-neu-actions'
import { useTransition, hideOverlayBusy } from '@/components/ui/action-busy'

export type FabOverlayArt =
  | 'kunde'
  | 'handwerker'
  | 'rechnung'
  | 'angebot'
  | 'anfrage'
  | 'termin'
  | 'todo'

const EVENT = 'fab-create'

const FAB_ARTS = new Set<FabOverlayArt>([
  'kunde',
  'handwerker',
  'rechnung',
  'angebot',
  'anfrage',
  'termin',
  'todo',
])

/** Öffnet Create-Overlay auf der aktuellen Seite (ohne weiße `/neu`-Zwischenseite). */
export function openFabCreate(art: FabOverlayArt) {
  if (typeof document === 'undefined') return
  // Nach Popover-Close: ein Tick warten, damit Overlay zuverlässig mountet
  window.setTimeout(() => {
    document.dispatchEvent(new CustomEvent(EVENT, { detail: { art } }))
  }, 0)
}

type GewerkOpt = { id: string; name: string; slug: string }

/**
 * Shell-Host für FAB-Create: Sheet/Picker/Funnel auf der aktuellen Seite.
 * Anfrage: Staff-Funnel Overlay (kein /anfragen/neu).
 * Angebot/Rechnung: Kunde wählen → Wizard-URL.
 * Kunde/Handwerker: Create-Sheet → Detail nach Speichern.
 * Termin / To-do: EditorSheet auf der aktuellen Seite.
 */
export function FabCreateHost() {
  const router = useRouter()
  const [art, setArt] = useState<FabOverlayArt | null>(null)
  const [gewerke, setGewerke] = useState<GewerkOpt[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ art?: FabOverlayArt }>).detail
      const next = detail?.art
      if (next && FAB_ARTS.has(next)) setArt(next)
    }
    document.addEventListener(EVENT, onOpen)
    return () => document.removeEventListener(EVENT, onOpen)
  }, [])

  // Popover-Busy ausblenden, sobald Overlay/Picker gemountet ist
  useEffect(() => {
    if (!art) return
    const t = window.setTimeout(() => hideOverlayBusy(), 60)
    return () => clearTimeout(t)
  }, [art])

  useEffect(() => {
    if (art !== 'handwerker') return
    if (gewerke.length > 0) return
    startTransition(async () => {
      const r = await listGewerkeFuerFab()
      if (r.ok) setGewerke(r.gewerke)
    })
  }, [art, gewerke.length, startTransition])

  const vorgangArt: FabVorgangArt | null =
    art === 'rechnung' || art === 'angebot' ? art : null

  return (
    <>
      <KundeModal
        open={art === 'kunde'}
        stayOnPage
        onClose={() => setArt(null)}
        onSaved={(id) => {
          setArt(null)
          if (id) router.push(`/kunden/${id}`)
        }}
      />

      <PartnerCreateSheet
        open={art === 'handwerker'}
        gewerkeOptionen={gewerke}
        stayOnPage
        onClose={() => setArt(null)}
        onSaved={(id) => {
          setArt(null)
          if (id) router.push(`/handwerker/${id}`)
        }}
      />

      <AnfrageWizard
        open={art === 'anfrage'}
        onClose={() => setArt(null)}
        onSuccess={(id) => {
          setArt(null)
          if (id) router.push(`/anfragen/${id}`)
        }}
      />

      <FabVorgangStartModal
        open={vorgangArt != null}
        art={vorgangArt}
        onClose={() => setArt(null)}
      />

      <KalenderTerminEditorSheet
        open={art === 'termin'}
        termin={null}
        onClose={() => setArt(null)}
        onSaved={() => {
          setArt(null)
          router.refresh()
        }}
      />

      <TodoEditorSheet
        open={art === 'todo'}
        todo={null}
        onClose={() => setArt(null)}
        onSaved={() => {
          setArt(null)
          router.refresh()
        }}
      />
    </>
  )
}

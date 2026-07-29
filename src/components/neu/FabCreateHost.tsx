'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { KundeModal } from '@/components/kunden/KundeModal'
import { PartnerCreateSheet } from '@/components/handwerker/PartnerCreateSheet'
import {
  FabVorgangStartModal,
  type FabVorgangArt,
} from '@/components/neu/FabVorgangStartModal'
import { listGewerkeFuerFab } from '@/app/(dashboard)/neu/fab-neu-actions'

export type FabOverlayArt = 'kunde' | 'handwerker' | 'rechnung' | 'angebot'

const EVENT = 'fab-create'

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
 * Shell-Host für FAB-Create: Sheet/Picker auf der aktuellen Seite.
 * Angebot/Rechnung: Kunde wählen → Wizard-URL.
 * Kunde/Handwerker: Create-Sheet → Detail nach Speichern.
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
      if (next === 'kunde' || next === 'handwerker' || next === 'rechnung' || next === 'angebot') {
        setArt(next)
      }
    }
    document.addEventListener(EVENT, onOpen)
    return () => document.removeEventListener(EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (art !== 'handwerker') return
    if (gewerke.length > 0) return
    startTransition(async () => {
      const r = await listGewerkeFuerFab()
      if (r.ok) setGewerke(r.gewerke)
    })
  }, [art, gewerke.length])

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

      <FabVorgangStartModal
        open={vorgangArt != null}
        art={vorgangArt}
        onClose={() => setArt(null)}
      />
    </>
  )
}

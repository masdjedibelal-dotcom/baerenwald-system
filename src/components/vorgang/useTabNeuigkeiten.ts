'use client'

import { useEffect, useState } from 'react'

import { ladeTabNeuigkeiten, type TabNeuigkeiten } from '@/app/(dashboard)/vorgaenge/tab-neuigkeiten-actions'

function lies(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}
function schreib(key: string, wert: string) {
  try {
    window.localStorage.setItem(key, wert)
  } catch {
    /* privat/blockiert — dann eben ohne Merker */
  }
}

/**
 * Punkt am Reiter, wenn es dort seit dem letzten Ansehen etwas Neues gibt
 * (Tagebuch-Eintrag, Dokument, Antwort-Mail, Partner-Rechnung).
 * „Gesehen“ wird je Gerät gemerkt; beim ersten Öffnen eines Vorgangs gilt alles als gesehen.
 */
export function useTabNeuigkeiten(
  vorgangKey: string,
  ids: { auftragId?: string | null; leadId?: string | null },
  aktiverTab: string
): Record<string, boolean> {
  const [zeiten, setZeiten] = useState<TabNeuigkeiten>({})
  const [stand, setStand] = useState(0)
  const idsKey = `${ids.auftragId ?? ''}|${ids.leadId ?? ''}`

  useEffect(() => {
    let aktiv = true
    const [auftragId, leadId] = idsKey.split('|')
    void ladeTabNeuigkeiten({ auftragId: auftragId || null, leadId: leadId || null }).then((z) => {
      if (aktiv) setZeiten(z)
    })
    return () => {
      aktiv = false
    }
  }, [idsKey])

  // Aktiven Reiter als gesehen merken; beim ersten Besuch alle Reiter
  useEffect(() => {
    const jetzt = new Date().toISOString()
    const ersterBesuch = lies(`teo-gesehen:${vorgangKey}`) === null
    if (ersterBesuch) {
      schreib(`teo-gesehen:${vorgangKey}`, jetzt)
      for (const tab of ['tagebuch', 'akte', 'zahlung']) schreib(`teo-gesehen:${vorgangKey}:${tab}`, jetzt)
    }
    schreib(`teo-gesehen:${vorgangKey}:${aktiverTab}`, jetzt)
    setStand((n) => n + 1)
  }, [vorgangKey, aktiverTab])

  const neu: Record<string, boolean> = {}
  void stand
  for (const [tab, zeit] of Object.entries(zeiten)) {
    if (!zeit || tab === aktiverTab) continue
    const gesehen = lies(`teo-gesehen:${vorgangKey}:${tab}`)
    neu[tab] = !gesehen || zeit > gesehen
  }
  return neu
}

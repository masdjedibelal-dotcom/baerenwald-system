import { rebindLooseAnfahrtPositionen, rebindLooseAnfahrtZeilen } from '@/lib/anfahrt-angebot'
import { normalizeAngebotPositionen, repairAngebotPositionen } from '@/lib/angebot-positionen'
import { preislisteEinheitspreisNetto } from '@/lib/angebote/angebot-positionen-from-lead'
import { angebotPositionenToDokumentZeilen, type DokumentZeile } from '@/lib/dokument-zeilen'
import type { AngebotPosition, Gewerk, Preisliste } from '@/lib/types'

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Gespeicherte Angebotspositionen → Wizard-Zeilen (Preise & Anfahrt stabil). */
export function angebotPositionenToWizardZeilen(
  positionen: unknown,
  preislisten: Preisliste[] = [],
  gewerke: Gewerk[] = []
): DokumentZeile[] {
  const norm = repairAngebotPositionen(
    rebindLooseAnfahrtPositionen(normalizeAngebotPositionen(positionen))
  )
  let zeilen = angebotPositionenToDokumentZeilen(norm, gewerke)

  if (preislisten.length) {
    const byId = new Map(preislisten.map((p) => [p.id, p]))
    zeilen = zeilen.map((z) => {
      if (z.typ !== 'artikel' || !z.preisliste_id) return z
      const p = norm.find((x) => x.id === z.id)
      const savedVk = p ? num(p.vk_netto) : 0
      if (savedVk > 0) return z
      if (z.vkNetto > 0) return z
      const pl = byId.get(z.preisliste_id)
      if (!pl) return z
      const catVk = preislisteEinheitspreisNetto(pl)
      if (catVk <= 0) return z
      return { ...z, vkNetto: catVk }
    })
  }

  return rebindLooseAnfahrtZeilen(zeilen)
}

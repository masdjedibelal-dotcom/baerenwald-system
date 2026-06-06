import {
  neueArtikelZeile,
  istFreitextPosition,
  istGesamtrabattPosition,
  type DokumentArtikelZeile,
  type DokumentZeile,
} from '@/lib/dokument-zeilen'
import type { FirmenEinstellungen } from '@/lib/einstellungen-keys'
import type { AngebotPosition } from '@/lib/types'

export const GEWERK_SLUG_ANFAHRT = '__anfahrt__'

export type AnfahrtGewerkBlockRef = {
  key: string
  gewerkId?: string
  gewerkName?: string
  gewerkSlug?: string
}

export function parseAnfahrtPauschaleNetto(firm: FirmenEinstellungen): number {
  const n = parseFloat(String(firm.anfahrt_pauschale_netto ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 49
}

export function anfahrtLeistungText(firm: FirmenEinstellungen): string {
  return firm.anfahrt_leistung_text?.trim() || 'Anfahrtskosten (Pauschale)'
}

export function isAnfahrtZeile(z: DokumentZeile): boolean {
  return (
    z.typ === 'artikel' &&
    (z.kostenart === 'anfahrt' || z.gewerk_slug === GEWERK_SLUG_ANFAHRT)
  )
}

export function findAnfahrtZeile(zeilen: DokumentZeile[]): DokumentArtikelZeile | undefined {
  for (const z of zeilen) {
    if (z.typ === 'artikel' && isAnfahrtZeile(z)) return z
  }
  return undefined
}

export function findAnfahrtZeilen(zeilen: DokumentZeile[]): DokumentArtikelZeile[] {
  return zeilen.filter(
    (z): z is DokumentArtikelZeile => z.typ === 'artikel' && isAnfahrtZeile(z)
  )
}

/** Anfahrt in einem bestimmten Gewerk-Abschnitt (gewerk_block_key). */
export function findAnfahrtZeileForBlock(
  zeilen: DokumentZeile[],
  blockKey: string
): DokumentArtikelZeile | undefined {
  const key = blockKey.trim()
  if (!key) return undefined
  for (const z of zeilen) {
    if (z.typ !== 'artikel' || !isAnfahrtZeile(z)) continue
    if ((z.gewerk_block_key?.trim() || '') === key) return z
  }
  return undefined
}

export function hatAnfahrtFuerBlock(zeilen: DokumentZeile[], blockKey: string): boolean {
  return Boolean(findAnfahrtZeileForBlock(zeilen, blockKey))
}

export function createAnfahrtZeile(firm: FirmenEinstellungen): DokumentArtikelZeile {
  return neueArtikelZeile({
    bezeichnung: anfahrtLeistungText(firm),
    vkNetto: parseAnfahrtPauschaleNetto(firm),
    menge: 1,
    einheit: 'pauschal',
    gewerkName: 'Allgemein',
    gewerk_slug: GEWERK_SLUG_ANFAHRT,
    kostenart: 'anfahrt',
    kostenverteilung: 'lohn',
  })
}

export function ohneAnfahrtZeilen(zeilen: DokumentZeile[]): DokumentZeile[] {
  return zeilen.filter((z) => !isAnfahrtZeile(z))
}

/** Anfahrt dem Gewerk-Abschnitt zuordnen (nicht als eigener PDF-Block). */
export function bindAnfahrtToGewerkBlock(
  z: DokumentArtikelZeile,
  block: AnfahrtGewerkBlockRef
): DokumentArtikelZeile {
  return {
    ...z,
    gewerk_block_key: block.key,
    gewerk_id: block.gewerkId?.trim() || z.gewerk_id,
    gewerkName: block.gewerkName?.trim() || z.gewerkName,
    gewerk_slug: GEWERK_SLUG_ANFAHRT,
    kostenart: 'anfahrt',
    kostenverteilung: 'lohn',
  }
}

function inferAnfahrtTargetFromZeilen(zeilen: DokumentZeile[]): AnfahrtGewerkBlockRef | null {
  let lastKey = ''
  let lastMeta: Omit<AnfahrtGewerkBlockRef, 'key'> = {}

  for (const z of zeilen) {
    if (z.typ === 'artikel' && !isAnfahrtZeile(z)) {
      lastKey = z.gewerk_block_key?.trim() || z.gewerk_id?.trim() || z.gewerk_slug?.trim() || 'frei'
      lastMeta = {
        gewerkId: z.gewerk_id,
        gewerkName: z.gewerkName,
        gewerkSlug: z.gewerk_slug,
      }
    } else if (z.typ === 'freitext' || z.typ === 'gesamtrabatt') {
      if (z.gewerk_block_key?.trim()) lastKey = z.gewerk_block_key.trim()
    }
  }

  if (!lastKey) return null
  return { key: lastKey, ...lastMeta }
}

function inferAnfahrtTargetFromPositionen(positionen: AngebotPosition[]): AnfahrtGewerkBlockRef | null {
  let lastKey = ''
  let lastMeta: Omit<AnfahrtGewerkBlockRef, 'key'> = {}

  for (const p of positionen) {
    if ((p.gewerk_slug ?? '') === GEWERK_SLUG_ANFAHRT) continue
    if (istFreitextPosition(p) || istGesamtrabattPosition(p)) {
      if (p.gewerk_block_key?.trim()) lastKey = p.gewerk_block_key.trim()
      continue
    }
    lastKey =
      p.gewerk_block_key?.trim() ||
      p.gewerk_id?.trim() ||
      p.gewerk_slug?.trim() ||
      p.gewerk_name?.trim() ||
      'frei'
    lastMeta = {
      gewerkId: p.gewerk_id,
      gewerkName: p.gewerk_name,
      gewerkSlug: p.gewerk_slug ?? undefined,
    }
  }

  if (!lastKey) return null
  return { key: lastKey, ...lastMeta }
}

/** Wizard-Zeilen: lose Anfahrten (ohne gewerk_block_key) an passendes Gewerk hängen. */
export function rebindLooseAnfahrtZeilen(zeilen: DokumentZeile[]): DokumentZeile[] {
  let changed = false
  const next = zeilen.map((z) => {
    if (z.typ !== 'artikel' || !isAnfahrtZeile(z) || z.gewerk_block_key?.trim()) return z
    const target = inferAnfahrtTargetFromZeilen(zeilen)
    if (!target) return z
    changed = true
    return bindAnfahrtToGewerkBlock(z, target)
  })
  return changed ? next : zeilen
}

/** Gespeicherte Positionen: lose Anfahrten in Gewerk-Block statt eigener Abschnitt. */
export function rebindLooseAnfahrtPositionen(positionen: AngebotPosition[]): AngebotPosition[] {
  const target = inferAnfahrtTargetFromPositionen(positionen)
  if (!target) return positionen
  let changed = false
  const next = positionen.map((p) => {
    if ((p.gewerk_slug ?? '') !== GEWERK_SLUG_ANFAHRT || p.gewerk_block_key?.trim()) return p
    changed = true
    return {
      ...p,
      gewerk_block_key: target.key,
      gewerk_id: target.gewerkId?.trim() || p.gewerk_id,
      gewerk_name: target.gewerkName?.trim() || p.gewerk_name,
    }
  })
  return changed ? next : positionen
}

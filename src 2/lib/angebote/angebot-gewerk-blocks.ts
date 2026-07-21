import { GEWERK_SLUG_ANFAHRT, isAnfahrtZeile } from '@/lib/anfahrt-angebot'
import { neuePositionsId } from '@/lib/angebot-positionen'
import type { DokumentArtikelZeile, DokumentZeile } from '@/lib/dokument-zeilen'
import type { Gewerk } from '@/lib/types'

export const GEWERK_BLOCK_ANFAHRT = '__anfahrt__'
export const GEWERK_BLOCK_SONST = '__sonst__'

export type GewerkPositionsBlock = {
  key: string
  gewerkId: string
  gewerkName: string
  gewerkSlug: string
  zeilen: DokumentZeile[]
}

export function gewerkBlockKeyForArtikel(z: DokumentArtikelZeile): string {
  const explicit = z.gewerk_block_key?.trim()
  if (explicit) return explicit
  if (z.gewerk_slug === GEWERK_SLUG_ANFAHRT) return GEWERK_BLOCK_ANFAHRT
  return z.gewerk_id?.trim() || GEWERK_BLOCK_SONST
}

function blockMetaForKey(
  key: string,
  gewerke: Gewerk[],
  sample?: DokumentArtikelZeile
): Omit<GewerkPositionsBlock, 'key' | 'zeilen'> {
  if (key === GEWERK_BLOCK_ANFAHRT) {
    return { gewerkId: '', gewerkName: 'Anfahrt', gewerkSlug: GEWERK_SLUG_ANFAHRT }
  }
  if (key === GEWERK_BLOCK_SONST) {
    return { gewerkId: '', gewerkName: 'Sonstiges', gewerkSlug: 'sonst' }
  }
  const gewerkId = sample?.gewerk_id?.trim() || gewerke.find((x) => x.id === key)?.id || ''
  const g = gewerke.find((x) => x.id === gewerkId)
  return {
    gewerkId,
    gewerkName: sample?.gewerkName?.trim() || g?.name || 'Gewerk',
    gewerkSlug: sample?.gewerk_slug ?? g?.slug ?? '',
  }
}

/** Zeilen in Gewerk-Blöcke aufteilen (Reihenfolge der ersten Zeile pro Block bleibt erhalten). */
export function groupZeilenByGewerk(zeilen: DokumentZeile[], gewerke: Gewerk[]): GewerkPositionsBlock[] {
  const map = new Map<string, GewerkPositionsBlock>()
  const order: string[] = []
  let lastKey = GEWERK_BLOCK_SONST

  const ensure = (key: string, sample?: DokumentArtikelZeile) => {
    if (!map.has(key)) {
      order.push(key)
      map.set(key, { key, zeilen: [], ...blockMetaForKey(key, gewerke, sample) })
    }
    return map.get(key)!
  }

  for (const z of zeilen) {
    if (z.typ === 'gesamtrabatt') continue
    if (z.typ === 'artikel') {
      lastKey = gewerkBlockKeyForArtikel(z)
      ensure(lastKey, z).zeilen.push(z)
    } else {
      const blockKey =
        z.gewerk_block_key?.trim() || (z.typ === 'freitext' ? lastKey : GEWERK_BLOCK_SONST)
      lastKey = blockKey
      ensure(blockKey).zeilen.push(z)
    }
  }

  return order.map((k) => map.get(k)!)
}

export function mergeGewerkBlocks(blocks: GewerkPositionsBlock[]): DokumentZeile[] {
  return blocks.flatMap((b) => normalizeBlockZeilen(b, b.zeilen))
}

/** Freitext/Rabatt und Artikel an den Gewerk-Abschnitt binden (für Speichern & PDF). */
export function normalizeBlockZeilen(
  block: GewerkPositionsBlock,
  zeilen: DokumentZeile[]
): DokumentZeile[] {
  return zeilen.map((z) => {
    if (z.typ === 'gesamtrabatt') return z
    if (z.typ === 'freitext') {
      return { ...z, gewerk_block_key: z.gewerk_block_key?.trim() || block.key }
    }
    if (z.typ === 'artikel') {
      if (isAnfahrtZeile(z)) {
        return {
          ...z,
          gewerk_block_key: z.gewerk_block_key?.trim() || block.key,
          gewerk_id: z.gewerk_id ?? block.gewerkId,
          gewerkName: z.gewerkName ?? block.gewerkName,
          gewerk_slug: GEWERK_SLUG_ANFAHRT,
          kostenart: 'anfahrt' as const,
          kostenverteilung: 'lohn' as const,
        }
      }
      return {
        ...z,
        gewerk_block_key: z.gewerk_block_key?.trim() || block.key,
        gewerk_id: z.gewerk_id ?? block.gewerkId,
        gewerkName: z.gewerkName ?? block.gewerkName,
        gewerk_slug: z.gewerk_slug ?? block.gewerkSlug,
      }
    }
    return z
  })
}

export function emptyGewerkBlock(gewerk: Gewerk, sectionKey?: string): GewerkPositionsBlock {
  const key = sectionKey?.trim() || gewerk.id
  return {
    key,
    gewerkId: gewerk.id,
    gewerkName: gewerk.name,
    gewerkSlug: gewerk.slug,
    zeilen: [],
  }
}

/** Neuer Wizard-Abschnitt — auch wenn dasselbe Gewerk schon existiert. */
export function neueGewerkSection(gewerk: Gewerk): GewerkPositionsBlock {
  return emptyGewerkBlock(gewerk, neuePositionsId())
}

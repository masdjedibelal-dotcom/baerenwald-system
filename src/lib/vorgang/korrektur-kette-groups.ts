import type { VorgangListeRow } from '@/lib/vorgang/types'

export type KorrekturKetteRole = 'original' | 'gutschrift' | 'neu'

/** Root-ID der Korrektur-Familie (Original-RE), sonst null. */
export function korrekturKetteRootId(row: VorgangListeRow): string | null {
  if (row.phase !== 'rechnung') return null
  if (row.belegTyp === 'gutschrift') {
    const bezug = String(row.bezug_rechnung_id ?? '').trim()
    return bezug || null
  }
  const von = String(row.korrektur_von ?? '').trim()
  if (von) return von
  if (String(row.ersetzt_durch ?? '').trim()) return row.entityId
  return null
}

export function korrekturKetteRole(row: VorgangListeRow): KorrekturKetteRole | null {
  if (row.phase !== 'rechnung') return null
  if (row.belegTyp === 'gutschrift') return 'gutschrift'
  if (String(row.korrektur_von ?? '').trim()) return 'neu'
  if (String(row.ersetzt_durch ?? '').trim()) return 'original'
  return null
}

export function korrekturKetteRoleLabel(role: KorrekturKetteRole): string {
  if (role === 'original') return 'Original'
  if (role === 'gutschrift') return 'Storno-Gutschrift'
  return 'Korrektur'
}

const ROLE_ORDER: Record<KorrekturKetteRole, number> = {
  original: 0,
  gutschrift: 1,
  neu: 2,
}

export type KorrekturKetteGroup = {
  rootId: string
  /** Zeile die in der Hauptliste steht (neue RE oder Original). */
  head: VorgangListeRow
  members: Array<{ row: VorgangListeRow; role: KorrekturKetteRole }>
  pending: boolean
  label: string
}

/**
 * Baut Korrektur-Familien aus flachen Listen-Zeilen.
 * Einzelzeilen ohne Kette → groups mit nur head, members.length === 1.
 */
export function groupVorgaengeByKorrekturKette(rows: VorgangListeRow[]): {
  groups: KorrekturKetteGroup[]
  /** entityIds die als Kind unter einer Kette hängen (nicht nochmal top-level). */
  childIds: Set<string>
} {
  const byId = new Map(rows.map((r) => [r.entityId, r]))
  const buckets = new Map<string, VorgangListeRow[]>()

  for (const row of rows) {
    const root = korrekturKetteRootId(row)
    if (!root) continue
    const list = buckets.get(root) ?? []
    list.push(row)
    buckets.set(root, list)
  }

  // Original ggf. nachziehen, falls Root-ID nicht in rows (selten)
  for (const [rootId, list] of buckets) {
    if (!list.some((r) => r.entityId === rootId) && byId.has(rootId)) {
      list.push(byId.get(rootId)!)
    }
  }

  const childIds = new Set<string>()
  const groups: KorrekturKetteGroup[] = []
  const consumed = new Set<string>()

  for (const [rootId, list] of buckets) {
    const uniq = new Map<string, VorgangListeRow>()
    for (const r of list) uniq.set(r.entityId, r)
    const members = [...uniq.values()]
      .map((row) => {
        const role = korrekturKetteRole(row) ?? (row.entityId === rootId ? 'original' : 'neu')
        return { row, role: role as KorrekturKetteRole }
      })
      .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])

    if (members.length < 2) continue

    const neu = members.find((m) => m.role === 'neu')
    const original = members.find((m) => m.role === 'original')
    const head = neu?.row ?? original?.row ?? members[members.length - 1]!.row
    const pending = members.some(
      (m) =>
        String(m.row.unterstatus).toLowerCase() === 'entwurf' ||
        (m.role === 'original' &&
          String(m.row.unterstatus).toLowerCase() !== 'storniert' &&
          Boolean(m.row.ersetzt_durch))
    )

    const origNr =
      original?.row.titel?.replace(/^Rechnung\s+/i, '') ||
      members.find((m) => m.role === 'original')?.row.entityId.slice(0, 8)
    const neuNr =
      neu?.row.titel?.replace(/^Rechnung\s+/i, '') ||
      (neu ? 'Entwurf' : null)
    const label = pending
      ? `Korrektur${origNr ? ` ${origNr}` : ''}${neuNr ? ` → ${neuNr}` : ''} (Entwurf)`
      : `Korrektur${origNr && neuNr ? ` ${origNr} → ${neuNr}` : ''}`

    for (const m of members) {
      if (m.row.entityId !== head.entityId) childIds.add(m.row.entityId)
      consumed.add(m.row.entityId)
    }

    groups.push({ rootId, head, members, pending, label })
  }

  // Restliche Zeilen als Single-Groups (Reihenfolge der Eingabe)
  for (const row of rows) {
    if (consumed.has(row.entityId)) continue
    groups.push({
      rootId: row.entityId,
      head: row,
      members: [{ row, role: 'neu' }],
      pending: false,
      label: row.titel,
    })
    consumed.add(row.entityId)
  }

  // Reihenfolge: nach head.updatedAt der ursprünglichen displayItems-Order
  const order = new Map(rows.map((r, i) => [r.entityId, i]))
  groups.sort(
    (a, b) => (order.get(a.head.entityId) ?? 0) - (order.get(b.head.entityId) ?? 0)
  )

  return { groups, childIds }
}

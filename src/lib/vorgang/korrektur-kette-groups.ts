import type { VorgangListeRow } from '@/lib/vorgang/types'

export type KorrekturKetteRole = 'original' | 'gutschrift' | 'neu'

/** Wurzel-ID der Korrektur-Familie innerhalb der gegebenen Zeilen. */
export function korrekturKetteRootId(
  row: VorgangListeRow,
  byId?: Map<string, VorgangListeRow>
): string | null {
  if (row.phase !== 'rechnung') return null

  let cur: VorgangListeRow | null = row
  const seen = new Set<string>()
  for (let i = 0; i < 24; i++) {
    if (!cur || seen.has(cur.entityId)) break
    seen.add(cur.entityId)

    if (cur.belegTyp === 'gutschrift') {
      const bezug = String(cur.bezug_rechnung_id ?? '').trim()
      if (!bezug) return null
      if (byId?.has(bezug)) {
        cur = byId.get(bezug)!
        continue
      }
      return bezug
    }

    const von = String(cur.korrektur_von ?? '').trim()
    if (von) {
      if (byId?.has(von)) {
        cur = byId.get(von)!
        continue
      }
      return von
    }

    if (String(cur.ersetzt_durch ?? '').trim()) return cur.entityId
    break
  }

  if (row.belegTyp === 'gutschrift') return String(row.bezug_rechnung_id ?? '').trim() || null
  if (String(row.korrektur_von ?? '').trim()) return String(row.korrektur_von).trim()
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
  if (role === 'gutschrift') return 'Storno'
  return 'Korrektur'
}

const ROLE_ORDER: Record<KorrekturKetteRole, number> = {
  original: 0,
  gutschrift: 1,
  neu: 2,
}

export type KorrekturKetteGroup = {
  rootId: string
  /** Zeile die in der Hauptliste steht (aktuelle Korrektur-RE). */
  head: VorgangListeRow
  members: Array<{ row: VorgangListeRow; role: KorrekturKetteRole }>
  pending: boolean
  label: string
}

/**
 * Baut Korrektur-Familien aus flachen Listen-Zeilen.
 * Storno-Gutschriften werden nie als eigene Listenkarte geführt.
 */
export function groupVorgaengeByKorrekturKette(rows: VorgangListeRow[]): {
  groups: KorrekturKetteGroup[]
  /** entityIds die als Kind unter einer Kette hängen (nicht nochmal top-level). */
  childIds: Set<string>
} {
  const byId = new Map(rows.map((r) => [r.entityId, r]))
  const buckets = new Map<string, VorgangListeRow[]>()

  for (const row of rows) {
    // Gutschriften nie eigene Gruppe — nur anhängen, wenn Root schon da
    if (row.belegTyp === 'gutschrift') {
      const root = korrekturKetteRootId(row, byId)
      if (!root) continue
      const list = buckets.get(root) ?? []
      list.push(row)
      buckets.set(root, list)
      continue
    }
    const root = korrekturKetteRootId(row, byId)
    if (!root) continue
    const list = buckets.get(root) ?? []
    list.push(row)
    buckets.set(root, list)
  }

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
      .sort((a, b) => {
        const ra = ROLE_ORDER[a.role]
        const rb = ROLE_ORDER[b.role]
        if (ra !== rb) return ra - rb
        return String(a.row.updatedAt).localeCompare(String(b.row.updatedAt))
      })

    // Mindestens Original+Korrektur oder Korrektur allein mit Gutschrift
    const hasNeu = members.some((m) => m.role === 'neu')
    const hasGs = members.some((m) => m.role === 'gutschrift')
    if (!hasNeu && !hasGs && members.length < 2) continue
    if (members.length < 2 && !hasNeu) continue

    const neuMembers = members.filter((m) => m.role === 'neu')
    const tipNeu =
      [...neuMembers].reverse().find((m) => !String(m.row.ersetzt_durch ?? '').trim()) ??
      neuMembers[neuMembers.length - 1]
    const original = members.find((m) => m.role === 'original')
    const head = tipNeu?.row ?? original?.row ?? members[members.length - 1]!.row

    const pending = members.some(
      (m) =>
        String(m.row.unterstatus).toLowerCase() === 'entwurf' &&
        (m.role === 'neu' || m.role === 'gutschrift')
    )

    const label = head.titel

    for (const m of members) {
      if (m.row.entityId !== head.entityId) childIds.add(m.row.entityId)
      consumed.add(m.row.entityId)
    }

    groups.push({ rootId, head, members, pending, label })
  }

  for (const row of rows) {
    if (consumed.has(row.entityId)) continue
    // Storno-Gutschrift ohne erkennbare Kette: nicht als eigene Card
    if (row.belegTyp === 'gutschrift') {
      consumed.add(row.entityId)
      childIds.add(row.entityId)
      continue
    }
    groups.push({
      rootId: row.entityId,
      head: row,
      members: [{ row, role: 'neu' }],
      pending: false,
      label: row.titel,
    })
    consumed.add(row.entityId)
  }

  const order = new Map(rows.map((r, i) => [r.entityId, i]))
  groups.sort(
    (a, b) => (order.get(a.head.entityId) ?? 0) - (order.get(b.head.entityId) ?? 0)
  )

  return { groups, childIds }
}

/** Listen-Status für Korrektur-Kopfzeile. */
export function korrekturKetteListenStatus(group: KorrekturKetteGroup): {
  label: string
  kind: 'neu' | 'warten' | 'aktiv' | 'fertig' | 'storniert' | 'plain'
} | null {
  if (group.members.length < 2 && !group.pending) return null
  if (group.pending) return { label: 'Korrektur Entwurf', kind: 'neu' }
  const tip = group.members.filter((m) => m.role === 'neu').at(-1)?.row ?? group.head
  const st = String(tip.unterstatus).toLowerCase()
  if (st === 'bezahlt') return { label: 'Bezahlt', kind: 'fertig' }
  if (st === 'gesendet' || st === 'versendet') {
    return { label: 'Korrektur versendet', kind: 'warten' }
  }
  if (String(tip.korrektur_von ?? '').trim()) {
    return { label: 'Korrektur versendet', kind: 'warten' }
  }
  return null
}

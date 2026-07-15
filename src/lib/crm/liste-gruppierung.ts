export type ListeGruppierung<T> = {
  key: string
  label: string
  items: T[]
}

export function gruppierenNachSchluessel<T>(
  items: T[],
  schluessel: (item: T) => string,
  label: (item: T, key: string) => string
): ListeGruppierung<T>[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = schluessel(item)
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return Array.from(map.entries())
    .map(([key, groupItems]) => ({
      key,
      label: label(groupItems[0], key),
      items: groupItems,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

export function gruppierenNachKunde<T>(
  items: T[],
  kundeId: (item: T) => string | null | undefined,
  kundeName: (item: T) => string
): ListeGruppierung<T>[] {
  return gruppierenNachSchluessel(
    items,
    (item) => {
      const id = kundeId(item)?.trim()
      return id ? `kunde:${id}` : `ohne:${kundeName(item)}`
    },
    (item) => kundeName(item) || 'Ohne Kunde'
  )
}

export function gruppierenNachAuftrag<T>(
  items: T[],
  auftragId: (item: T) => string | null | undefined,
  auftragLabel: (item: T) => string
): ListeGruppierung<T>[] {
  return gruppierenNachSchluessel(
    items,
    (item) => {
      const id = auftragId(item)?.trim()
      return id ? `auftrag:${id}` : 'ohne-auftrag'
    },
    (item, key) => (key === 'ohne-auftrag' ? 'Ohne Auftrag' : auftragLabel(item))
  )
}

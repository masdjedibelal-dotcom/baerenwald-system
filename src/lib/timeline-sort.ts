/** Timeline-Einträge chronologisch: älteste zuerst. */
export function sortTimelineByCreatedAtAsc<T extends { created_at: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
}

export function sortByDateFieldAsc<T>(rows: T[], field: keyof T): T[] {
  return [...rows].sort((a, b) => {
    const av = a[field]
    const bv = b[field]
    return new Date(String(av ?? '')).getTime() - new Date(String(bv ?? '')).getTime()
  })
}

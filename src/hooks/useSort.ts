import { useCallback, useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc' | null

export function useSort<T extends object>(data: T[], defaultField?: string) {
  const [field, setField] = useState<string | null>(defaultField ?? null)
  const [dir, setDir] = useState<SortDir>('desc')

  const resetSort = useCallback(() => {
    setField(null)
    setDir('desc')
  }, [])

  const handleSort = (f: string) => {
    if (field === f) {
      if (dir === 'desc') setDir('asc')
      else if (dir === 'asc') {
        setField(null)
        setDir('desc')
      }
    } else {
      setField(f)
      setDir('desc')
    }
  }

  const sorted = useMemo(() => {
    if (!field) return data
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[field]
      const bv = (b as Record<string, unknown>)[field]
      if (av === null || av === undefined) return 1
      if (bv === null || bv === undefined) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return dir === 'asc' ? av.localeCompare(bv, 'de') : bv.localeCompare(av, 'de')
      }
      const an = Number(av)
      const bn = Number(bv)
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        return dir === 'asc' ? an - bn : bn - an
      }
      return 0
    })
  }, [data, field, dir])

  return { sorted, field, dir: field ? dir : null, handleSort, resetSort }
}

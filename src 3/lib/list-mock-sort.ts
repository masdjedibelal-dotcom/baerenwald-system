import type { SortDir } from '@/hooks/useSort'

export function listSortDirNum(dir: SortDir | null): 1 | -1 {
  return dir === 'asc' ? 1 : -1
}

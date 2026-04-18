'use client'

import { Toaster } from 'sonner'
import { SearchProvider } from '@/components/layout/SearchContext'
import { GlobalSearch } from '@/components/layout/GlobalSearch'
import { DatenschutzHintModal } from '@/components/datenschutz/DatenschutzHintModal'

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      {children}
      <GlobalSearch />
      <DatenschutzHintModal />
      <Toaster position="bottom-right" richColors closeButton duration={4000} />
    </SearchProvider>
  )
}

import type { Metadata } from 'next'

/** Browser-Titel für /anfragen/* (sonst greift der Standard „Dashboard“) */
export const metadata: Metadata = {
  title: 'Anfrage',
}

/** Detail/Neu unter /anfragen/* — Listen-Root redirectet nach /vorgaenge. */
export default function AnfragenLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-md:pb-mobile-fab-extra">{children}</div>
}

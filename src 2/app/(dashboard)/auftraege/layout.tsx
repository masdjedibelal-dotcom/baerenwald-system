import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aufträge',
}

/** Detail unter /auftraege/* — Listen-Root redirectet nach /vorgaenge. */
export default function AuftraegeLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-md:pb-mobile-fab-extra">{children}</div>
}

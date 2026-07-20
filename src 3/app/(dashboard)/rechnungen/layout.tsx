import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rechnungen',
}

/** Detail/Wizard unter /rechnungen/* — Listen-Root redirectet nach /vorgaenge. */
export default function RechnungenLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-md:pb-mobile-fab-extra">{children}</div>
}

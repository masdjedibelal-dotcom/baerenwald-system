import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Angebote',
}

/** Detail/Wizard unter /angebote/* — Listen-Root redirectet nach /vorgaenge. */
export default function AngeboteLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-md:pb-mobile-fab-extra">{children}</div>
}

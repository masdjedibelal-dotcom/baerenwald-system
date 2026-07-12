import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anfragen',
}

export const revalidate = 60

/** Listen-Inhalt kommt aus `anfragen/layout.tsx` (Master-Detail ab 900px). */
export default function AnfragenPage() {
  return null
}

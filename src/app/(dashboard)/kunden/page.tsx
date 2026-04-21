import { KundenListeClient } from '@/components/kunden/KundenListeClient'
import { loadKundenListe } from '@/lib/kunden/load-kunden-liste'

export default async function KundenPage() {
  const kunden = await loadKundenListe()
  return <KundenListeClient kunden={kunden} />
}

import { EinstellungenSubNav } from '@/components/einstellungen/EinstellungenSubNav'

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <EinstellungenSubNav />
      {children}
    </div>
  )
}

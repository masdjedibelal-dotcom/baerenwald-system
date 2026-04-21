import { EinstellungenSettingsNav } from '@/components/einstellungen/EinstellungenSettingsNav'

export default function EinstellungenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <EinstellungenSettingsNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

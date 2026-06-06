'use client'

import { RichTextContent } from '@/components/ui/RichTextContent'
import { formatDatum } from '@/lib/utils'
import type { AuftragBautagebuchEintrag } from '@/lib/types'

/** Vorschau eines Bautagebuch-Eintrags wie auf der Kunden-Statusseite */
export function BautagebuchKundenVorschau({ eintrag }: { eintrag: AuftragBautagebuchEintrag }) {
  return (
    <div className="bt-kunden-preview">
      <p className="text-xs font-medium uppercase tracking-wide text-[#2E7D52]">So sieht es der Kunde</p>
      <article className="bt-kunden-preview-card">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-[#1A3D2B]">{eintrag.titel}</h3>
          <time className="text-xs text-[#6B7280]">{formatDatum(eintrag.datum)}</time>
        </header>
        {eintrag.beschreibung?.trim() ? (
          <RichTextContent html={eintrag.beschreibung} className="mt-2 text-sm text-[#4B5563]" />
        ) : null}
        {(eintrag.foto_urls ?? []).length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(eintrag.foto_urls ?? []).map((url) => (
              <div key={url} className="overflow-hidden rounded-lg bg-[#F3F4F6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-28 w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  )
}

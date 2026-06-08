import { Sparkles } from 'lucide-react'

export function KiClaudeNarrative({ text }: { text: string | null | undefined }) {
  const t = text?.trim()
  if (!t) return null

  return (
    <div className="border-b border-bw-border bg-[#EAF3DE]/60 px-4 py-3">
      <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52]">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        KI-Auswertung (Claude)
      </p>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-bw-text">{t}</p>
    </div>
  )
}

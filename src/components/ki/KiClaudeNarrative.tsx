import { Sparkles } from 'lucide-react'

type Props = {
  text: string | null | undefined
  onGenerate?: () => void
  loading?: boolean
}

export function KiClaudeNarrative({ text, onGenerate, loading }: Props) {
  const t = text?.trim()
  if (t) {
    return (
      <div className="border-t border-[#2E7D52]/20 bg-[#EAF3DE]/60 px-4 py-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#2E7D52]">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          KI Ableitung
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-bw-text">{t}</p>
      </div>
    )
  }

  return (
    <div className="border-t border-bw-border bg-bw-bg/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        KI Ableitung
      </p>
      <p className="mt-1 text-sm text-muted">
        Grafik ist da — KI-Ableitung fehlt noch.
      </p>
      {onGenerate ? (
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#2E7D52]/30 bg-[#EAF3DE] px-2.5 py-1.5 text-xs font-medium text-[#2E7D52] hover:bg-[#EAF3DE]/80 disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {loading ? 'Generiere…' : 'KI-Ableitung generieren'}
        </button>
      ) : null}
    </div>
  )
}

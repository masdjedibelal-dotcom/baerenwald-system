import { MockIcon } from '@/components/mock-ui/MockIcon'
import { MockBtn } from '@/components/mock-ui'
type Props = {
  text: string | null | undefined
  onGenerate?: () => void
  loading?: boolean
}

export function KiClaudeNarrative({ text, onGenerate, loading }: Props) {
  const t = text?.trim()
  if (t) {
    return (
      <div className="border-t border-bw-primary/20 bg-bw-green-bg/60 px-4 py-3">
        <p className="mb-1.5 flex items-center gap-1.5 text-fs-caption font-semibold uppercase tracking-wider text-bw-primary">
          <MockIcon n="sparkles" ctx="default" className="h-3.5 w-3.5 shrink-0" aria-hidden />
          KI Ableitung
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-bw-text">{t}</p>
      </div>
    )
  }

  return (
    <div className="border-t border-bw-border bg-bw-bg/60 px-4 py-3">
      <p className="flex items-center gap-1.5 text-fs-caption font-semibold uppercase tracking-wider text-muted">
        <MockIcon n="sparkles" ctx="default" className="h-3.5 w-3.5 shrink-0" aria-hidden />
        KI Ableitung
      </p>
      <p className="mt-1 text-sm text-muted">
        Grafik ist da — KI-Ableitung fehlt noch.
      </p>
      {onGenerate ? (
        <MockBtn className="mt-2 inline-flex items-center gap-1.5 rounded-button border border-bw-primary/30 bg-bw-green-bg px-2.5 py-1.5 text-xs font-medium text-bw-primary hover:bg-bw-green-bg/80 disabled:opacity-50" type="button" onClick={onGenerate} disabled={loading}>
          <MockIcon n="sparkles" ctx="default" className="h-3.5 w-3.5" aria-hidden />
          {loading ? 'Generiere…' : 'KI-Ableitung generieren'}
        </MockBtn>
      ) : null}
    </div>
  )
}

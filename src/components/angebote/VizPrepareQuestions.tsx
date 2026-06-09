'use client'

import type { VizPrepareQuestion } from '@/lib/visualize/types'
import { cn } from '@/lib/utils'

type VizPrepareQuestionsProps = {
  question: VizPrepareQuestion
  disabled?: boolean
  onAnswer: (questionId: string, optionId: string, optionLabel: string) => void
  className?: string
}

export function VizPrepareQuestions({
  question,
  disabled,
  onAnswer,
  className,
}: VizPrepareQuestionsProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#2E7D52]/25 bg-[#EEF3EC] p-4',
        className
      )}
    >
      <p className="text-sm font-semibold text-bw-text">{question.question}</p>
      {question.hint ? (
        <p className="mt-1 text-xs text-bw-text-muted">{question.hint}</p>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            className={cn(
              'rounded-lg border border-bw-border bg-white px-3 py-2.5 text-left transition-colors',
              'hover:border-bw-primary hover:bg-bw-hover/30',
              disabled && 'pointer-events-none opacity-60'
            )}
            onClick={() => onAnswer(question.id, opt.id, opt.label)}
          >
            <span className="block text-sm font-medium text-bw-text">{opt.label}</span>
            {opt.hint ? (
              <span className="mt-0.5 block text-xs text-bw-text-muted">{opt.hint}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  )
}

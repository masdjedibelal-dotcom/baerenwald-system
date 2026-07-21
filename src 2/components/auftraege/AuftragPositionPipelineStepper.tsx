'use client'

import type { PipelineStep } from '@/lib/auftraege/position-handwerker-view'
import { cn } from '@/lib/utils'

export function AuftragPositionPipelineStepper({
  steps,
  compact = false,
}: {
  steps: PipelineStep[]
  compact?: boolean
}) {
  if (!steps.length) return null

  return (
    <div className={cn('pos-pipeline', compact && 'pos-pipeline--compact')} role="list" aria-label="Verhandlungs-Fortschritt">
      {steps.map((step, i) => (
        <div key={step.id} className="pos-pipeline__item" role="listitem">
          <div
            className={cn(
              'pos-pipeline__node',
              step.state === 'done' && 'pos-pipeline__node--done',
              step.state === 'active' && 'pos-pipeline__node--active',
              step.state === 'pending' && 'pos-pipeline__node--pending'
            )}
            title={step.label}
          >
            <span className="pos-pipeline__num" aria-hidden>
              {step.shortLabel.replace('①', '1').replace('②', '2').replace('③', '3').replace('④', '4').replace('⑤', '5').replace('⑥', '6')}
            </span>
          </div>
          {!compact ? (
            <span
              className={cn(
                'pos-pipeline__label',
                step.state === 'active' && 'pos-pipeline__label--active',
                step.state === 'done' && 'pos-pipeline__label--done'
              )}
            >
              {step.label}
            </span>
          ) : null}
          {i < steps.length - 1 ? (
            <div
              className={cn(
                'pos-pipeline__connector',
                step.state === 'done' && 'pos-pipeline__connector--done'
              )}
              aria-hidden
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

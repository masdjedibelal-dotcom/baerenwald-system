import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  label?: string
  color?: 'green' | 'blue' | 'orange'
}

export function ProgressBar({ value, max = 100, label, color = 'green' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  const colorClass = {
    green: 'bg-bw-success',
    blue: 'bg-bw-link',
    orange: 'bg-bw-accent',
  }[color]

  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-bw-light">{label}</span>
          <span className="text-xs font-medium text-bw-text">{pct}%</span>
        </div>
      ) : null}
      <div className="progress-bar">
        <div className={cn('progress-fill', colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

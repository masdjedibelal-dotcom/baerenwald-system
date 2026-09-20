'use client'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  hint?: string
  disabled?: boolean
}

/** Standard-Pill-Switch (ohne MockBtn — sonst wird daraus ein Kreis). */
export function Toggle({ checked, onChange, label, hint, disabled = false }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      {label || hint ? (
        <div>
          {label ? <div className="text-sm font-medium text-bw-text">{label}</div> : null}
          {hint ? <div className="text-xs text-bw-light">{hint}</div> : null}
        </div>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={checked ? 'switch on' : 'switch'}
        onClick={() => {
          if (!disabled) onChange(!checked)
        }}
      />
    </div>
  )
}

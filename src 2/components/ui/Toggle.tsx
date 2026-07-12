'use client'

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: string
  hint?: string
  disabled?: boolean
}

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
        onClick={() => !disabled && onChange(!checked)}
        className={cnToggle(disabled, checked)}
      >
        <span className={cnKnob(checked)} />
      </button>
    </div>
  )
}

function cnToggle(disabled: boolean, checked: boolean) {
  const base =
    'relative flex h-6 w-10 flex-shrink-0 rounded-full transition-colors duration-200'
  if (disabled) return `${base} cursor-not-allowed bg-bw-border opacity-40`
  return `${base} cursor-pointer ${checked ? 'bg-bw-success' : 'bg-bw-border'}`
}

function cnKnob(checked: boolean) {
  return `absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
    checked ? 'translate-x-5' : 'translate-x-1'
  }`
}

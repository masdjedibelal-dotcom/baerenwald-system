import type { ReactNode } from 'react'

/** Einheitliche Key-Value-Zeile in Detail-Cards (.props). */
export function DetailProp({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <div className="prop-l">{label}</div>
      <div className="prop-v">{children}</div>
    </div>
  )
}

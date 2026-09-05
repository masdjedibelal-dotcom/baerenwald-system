'use client'

import type { ReactNode } from 'react'
import { Camera } from 'lucide-react'
import { useImageFileDrop } from '@/hooks/useImageFileDrop'
import { cn } from '@/lib/utils'

type FotoDropZoneProps = {
  onFiles: (files: File[]) => void
  disabled?: boolean
  multiple?: boolean
  accept?: string
  className?: string
  /** Ohne `.lt-foto-zone` — nur className (z. B. Wizard-Upload). */
  bare?: boolean
  /** Standardtext (ohne Drag). */
  label?: string
  /** Text während Drag-Over. */
  labelDragging?: string
  /** Optional: anderes Icon statt Kamera. */
  icon?: ReactNode
  /** Vollständige Custom-Inhalte statt Icon+Label. */
  children?: ReactNode
}

/**
 * Gestrichelte Foto-Zone: Klick + Drag-and-Drop.
 * Default-Stil: `.lt-foto-zone` (Mock-Design-System).
 */
export function FotoDropZone({
  onFiles,
  disabled = false,
  multiple = false,
  accept = 'image/*',
  className,
  bare = false,
  label = 'Foto hinzufügen',
  labelDragging = 'Bilder hier ablegen',
  icon,
  children,
}: FotoDropZoneProps) {
  const { isDragging, submit, dropProps } = useImageFileDrop({
    disabled,
    multiple,
    onFiles,
  })

  return (
    <label
      className={cn(
        !bare && 'lt-foto-zone',
        isDragging && 'is-dragover',
        disabled && 'is-disabled',
        className
      )}
      {...dropProps}
    >
      {children ?? (
        <>
          {icon ?? <Camera className="h-5 w-5" aria-hidden />}
          <span>{isDragging ? labelDragging : label}</span>
        </>
      )}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          submit(e.target.files)
          e.target.value = ''
        }}
      />
    </label>
  )
}

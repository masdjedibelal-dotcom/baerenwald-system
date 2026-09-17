'use client'

import { useCallback, useState, type DragEvent } from 'react'

/** Bilder aus FileList/Files filtern (MIME oder bekannte Endung). */
export function filterImageFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return []
  return Array.from(list).filter(
    (f) =>
      f.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name)
  )
}

/**
 * Drag-and-Drop-Handler für Foto-Upload-Zonen.
 * `dropProps` auf das Drop-Target legen (label/div).
 */
export function useImageFileDrop(opts: {
  disabled?: boolean
  multiple?: boolean
  onFiles: (files: File[]) => void
}) {
  const { disabled = false, multiple = false, onFiles } = opts
  const [isDragging, setIsDragging] = useState(false)

  const submit = useCallback(
    (raw: FileList | File[] | null | undefined) => {
      const images = filterImageFiles(raw)
      if (!images.length) return
      onFiles(multiple ? images : images.slice(0, 1))
    },
    [multiple, onFiles]
  )

  const onDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setIsDragging(true)
    },
    [disabled]
  )

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rel = e.relatedTarget as Node | null
    if (!rel || !e.currentTarget.contains(rel)) setIsDragging(false)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (disabled) return
      submit(e.dataTransfer.files)
    },
    [disabled, submit]
  )

  return {
    isDragging,
    submit,
    dropProps: {
      onDragOver,
      onDragEnter: onDragOver,
      onDragLeave,
      onDrop,
    } as const,
  }
}

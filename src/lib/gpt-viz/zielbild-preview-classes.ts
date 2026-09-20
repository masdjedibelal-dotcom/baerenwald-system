/** Grüner Zielbild-Rahmen — kompakt auf Desktop, etwas größer auf Mobile. */
export const zielbildPreviewFrameClass =
  'w-full max-w-[min(100%,280px)] overflow-hidden rounded-sheet border border-bw-border bg-bw-dark md:max-w-[168px]'

/** Feed 4:5 — Desktop-Vorschau ca. 168×210 px (statt bis 540 px / volle Spalte). */
export const zielbildPreviewMediaClass =
  'mx-auto block aspect-[4/5] w-full max-h-[min(45vh,350px)] object-contain md:max-h-[210px]'

export const zielbildPreviewPlaceholderClass =
  'flex aspect-[4/5] w-full max-h-[min(45vh,350px)] items-center justify-center px-3 text-center text-xs text-status-order-text md:max-h-[210px]'

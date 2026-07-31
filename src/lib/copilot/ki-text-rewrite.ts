'use client'

/** Töne für Inline-Text-Rewrite (Mail, Dokument, …). */
export type KiRewriteTone = 'standard' | 'foermlicher' | 'einfacher' | 'kuerzer'

export const KI_REWRITE_TONES: {
  id: KiRewriteTone
  label: string
  hint: string
}[] = [
  { id: 'standard', label: 'Standard', hint: 'Klar umschreiben, Ton behalten' },
  { id: 'foermlicher', label: 'Förmlicher', hint: 'Höflicher, distanzierter' },
  { id: 'einfacher', label: 'Einfacher', hint: 'Kürzere Sätze, verständlicher' },
  { id: 'kuerzer', label: 'Kürzer', hint: 'Inhalt verdichten' },
]

export function kiRewriteToneLabel(tone: KiRewriteTone): string {
  return KI_REWRITE_TONES.find((t) => t.id === tone)?.label ?? 'Standard'
}

export function buildKiRewriteUserPrompt(opts: {
  tone: KiRewriteTone
  sourceText: string
  fieldLabel: string
  extraHint?: string | null
  userNote?: string | null
}): string {
  const toneLine =
    opts.tone === 'standard'
      ? 'Schreib den Text klar und professionell um, behalte den Ton.'
      : opts.tone === 'foermlicher'
        ? 'Schreib förmlicher und höflicher (Sie-Form wenn passend), ohne steif zu wirken.'
        : opts.tone === 'einfacher'
          ? 'Schreib einfacher und verständlicher, kurze Sätze.'
          : 'Kürze den Text deutlich, behalte die Kernaussage.'

  const parts = [
    `Aufgabe: Textfeld „${opts.fieldLabel}“ umschreiben (Handwerk CRM Bärenwald, kundensichtbar).`,
    toneLine,
    'Antworte NUR mit dem fertigen Text — kein Kommentar, keine Anführungszeichen, kein Markdown.',
    opts.extraHint?.trim() ? `Kontext: ${opts.extraHint.trim()}` : null,
    opts.userNote?.trim() ? `Zusatzwunsch: ${opts.userNote.trim()}` : null,
    '--- Aktueller Text ---',
    opts.sourceText.trim() || '(leer — formuliere einen passenden kurzen Text aus dem Kontext)',
  ]
  return parts.filter(Boolean).join('\n')
}

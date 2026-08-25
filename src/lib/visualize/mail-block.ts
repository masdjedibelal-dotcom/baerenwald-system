import type { AngebotMailAnrede } from '@/lib/templates/angebot-mail'

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Grüner Block für Angebots-Mail, wenn KI-Visualisierung im Angebot ist. */
export function mailKiVisualisierungBlock(
  anrede: AngebotMailAnrede,
  vorschauUrl: string
): string {
  if (!vorschauUrl.trim()) return ''

  const text =
    anrede === 'du'
      ? 'Im Angebot findest du eine <strong>KI-generierte Visualisierung</strong> — so könnte dein Projekt aussehen (PDF).'
      : 'Im Angebot finden Sie eine <strong>KI-generierte Visualisierung</strong> — so könnte Ihr Projekt aussehen (PDF).'

  return `<p style="font-size:14px;color:#374151;margin:0 0 16px;line-height:1.6;">${text}</p>`
}

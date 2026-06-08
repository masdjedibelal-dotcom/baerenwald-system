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
  const url = vorschauUrl.trim()
  if (!url) return ''

  const text =
    anrede === 'du'
      ? 'Wir haben dir eine KI-Visualisierung erstellt — so könnte dein Projekt aussehen. Du findest sie im Angebots-PDF.'
      : 'Wir haben Ihnen eine KI-Visualisierung erstellt — so könnte Ihr Projekt aussehen. Sie finden sie im Angebots-PDF.'

  return `<div style="background:#EAF3EE;border-radius:8px;padding:16px 20px;margin:20px 0;">
  <p style="font-size:13px;font-weight:700;color:#1A3D2B;margin:0 0 8px;">🎨 Visualisierung inklusive</p>
  <p style="font-size:13px;color:#374151;margin:0 0 12px;line-height:1.6;">${text}</p>
  <img src="${esc(url)}" alt="KI-Visualisierung" style="width:100%;max-width:520px;border-radius:6px;border:1px solid #E5E7EB;" />
</div>`
}

import type { KiAssistDraft } from '@/lib/copilot/ki-assist-scopes'

/** Wendet Mail-/Text-Entwurf auf Betreff + Body an. */
export function applyKiMailOrTextDraft(
  d: KiAssistDraft,
  apply: {
    setBetreff?: (v: string) => void
    setBody: (v: string) => void
  }
): boolean {
  if (d.type === 'mail') {
    if (d.betreff?.trim() && apply.setBetreff) apply.setBetreff(d.betreff.trim())
    if (d.text.trim()) apply.setBody(d.text.trim())
    return true
  }
  if (d.type === 'text') {
    if (d.titel?.trim() && apply.setBetreff) apply.setBetreff(d.titel.trim())
    if (d.text.trim()) apply.setBody(d.text.trim())
    return true
  }
  return false
}

export function applyKiDokumentTextDraft(
  d: KiAssistDraft,
  apply: { setText: (v: string) => void; setTitel?: (v: string) => void }
): boolean {
  if (d.type === 'text' || d.type === 'mail') {
    const text = d.type === 'mail' ? d.text : d.text
    const titel = d.type === 'mail' ? d.betreff : d.titel
    if (titel?.trim() && apply.setTitel) apply.setTitel(titel.trim())
    if (text.trim()) apply.setText(text.trim())
    return true
  }
  return false
}

/** Für Listen (z. B. Positionskarten): nur die zuletzt geöffnete KI-Zeile übernimmt. */
let kiAssistListTarget: string | null = null

export function setKiAssistListTarget(id: string | null) {
  kiAssistListTarget = id
}

export function claimKiAssistListTarget(id: string): boolean {
  if (kiAssistListTarget !== id) return false
  kiAssistListTarget = null
  return true
}

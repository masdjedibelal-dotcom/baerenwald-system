/** Markengrün für E-Mail-CTAs (inline styles — E-Mail-Clients unterstützen kein CSS extern). */
export const MAIL_BTN_GREEN = '#2E7D52'

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function escText(s: string): string {
  return escAttr(s).replace(/>/g, '&gt;')
}

export type MailButtonOpts = {
  /** Volle Breite, zentriert (z. B. „Projekt-Status ansehen“) */
  block?: boolean
  size?: 'md' | 'sm'
  margin?: string
}

function buttonBase(
  text: string,
  url: string,
  variant: 'primary' | 'secondary',
  opts?: MailButtonOpts
): string {
  const display = opts?.block ? 'block' : 'inline-block'
  const padding = opts?.size === 'sm' ? '10px 18px' : '12px 26px'
  const fontSize = opts?.size === 'sm' ? '14px' : '15px'
  const margin = opts?.margin ?? '20px 0'
  const textAlign = opts?.block ? 'text-align:center;' : ''

  if (variant === 'primary') {
    return `<a href="${escAttr(url)}" style="display:${display};background:${MAIL_BTN_GREEN};color:#FFFFFF;text-decoration:none;padding:${padding};border-radius:8px;font-weight:600;font-size:${fontSize};margin:${margin};border:2px solid ${MAIL_BTN_GREEN};font-family:Arial,Helvetica,sans-serif;${textAlign}">${escText(text)}</a>`
  }

  return `<a href="${escAttr(url)}" style="display:${display};background:transparent;color:${MAIL_BTN_GREEN};text-decoration:none;padding:${padding};border-radius:8px;font-weight:600;font-size:${fontSize};margin:${margin};border:2px solid ${MAIL_BTN_GREEN};font-family:Arial,Helvetica,sans-serif;${textAlign}">${escText(text)}</a>`
}

/** Hauptaktion in der Mail (z. B. Nachtrag bestätigen, Handwerker antworten). */
export function mailPrimaryButtonHtml(text: string, url: string, opts?: MailButtonOpts): string {
  return buttonBase(text, url, 'primary', opts)
}

/** Sekundär / ergänzend (z. B. MeinBärenwald, Partner-Portal-Hinweis). */
export function mailSecondaryButtonHtml(text: string, url: string, opts?: MailButtonOpts): string {
  return buttonBase(text, url, 'secondary', opts)
}

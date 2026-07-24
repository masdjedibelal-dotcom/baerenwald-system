/**
 * Copy-Stimme CRM Bärenwald
 *
 * - CRM intern (Staff-UI, Login, Toasts, Empty-Hints): Du
 * - Kunden-Mails/PDFs: Anrede-Feld am Kunden (du|sie) — immer resolveMailAnrede / mailText
 * - Partner-Portal / öffentliche Partner-Flows: Sie (formell)
 *
 * Keine feste „Sehr geehrte/r“-Vorlage ohne Anrede-Branch.
 */

export const CRM_COPY_VOICE = {
  staff: 'du',
  kundeMail: 'anrede-feld',
  partnerPortal: 'sie',
  publicForms: 'sie',
} as const

export type CrmCopyVoice = (typeof CRM_COPY_VOICE)[keyof typeof CRM_COPY_VOICE]

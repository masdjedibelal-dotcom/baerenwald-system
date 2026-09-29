/**
 * Copy-Stimme CRM Bärenwald
 *
 * - CRM intern (Staff-UI, Login, Toasts, Empty-Hints): Sie (Entscheidung 29.09.2026)
 * - Kunden-Mails/PDFs: immer Sie (resolveMailAnrede / mailAnredeFromKundeTyp)
 * - Partner-Portal / öffentliche Partner-Flows: Sie (formell)
 */
export const CRM_COPY_VOICE = {
  staff: 'sie',
  kundeMail: 'sie',
  partnerPortal: 'sie',
  publicForms: 'sie',
} as const

export type CrmCopyVoice = (typeof CRM_COPY_VOICE)[keyof typeof CRM_COPY_VOICE]

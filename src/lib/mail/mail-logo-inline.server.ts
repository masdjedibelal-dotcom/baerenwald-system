import 'server-only'


export type MailInlineLogoAttachment = {
  filename: string
  content: Buffer
  contentId: string
  contentType: string
}

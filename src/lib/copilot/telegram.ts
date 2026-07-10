import 'server-only'

import { splitTelegramChunks, TELEGRAM_MAX_MESSAGE_CHARS } from '@/lib/copilot/message-limits'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN ?? ''}`

function requireTelegramConfig(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID müssen gesetzt sein.')
  }
}

async function sendTelegramOnce(
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<void> {
  requireTelegramConfig()
  const payload: Record<string, unknown> = {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: text.slice(0, TELEGRAM_MAX_MESSAGE_CHARS),
  }
  if (parseMode) payload.parse_mode = parseMode

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Telegram sendMessage: ${err}`)
  }
}

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '')
}

function escapeTelegramPlain(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function sendTelegram(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
  try {
    await sendTelegramOnce(text, parseMode)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const htmlParseFailed =
      parseMode === 'HTML' &&
      (/can't parse entities|parse entities/i.test(msg) || /Bad Request/i.test(msg))

    if (!htmlParseFailed) throw e

    const plain = escapeTelegramPlain(stripHtmlTags(text))
    await sendTelegramOnce(plain)
  }
}

/** Lange Claude-Antworten in mehrere Telegram-Nachrichten aufteilen. */
export async function sendTelegramLong(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
  const chunks = splitTelegramChunks(text, TELEGRAM_MAX_MESSAGE_CHARS)
  for (const chunk of chunks) {
    await sendTelegram(chunk, parseMode)
  }
}

export async function sendTelegramTyping(): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) return
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      action: 'typing',
    }),
  }).catch(() => undefined)
}

export async function downloadTelegramFile(fileId: string): Promise<Buffer> {
  requireTelegramConfig()
  const fileRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${encodeURIComponent(fileId)}`)
  const fileData = (await fileRes.json()) as { ok?: boolean; result?: { file_path?: string } }
  const filePath = fileData.result?.file_path
  if (!filePath) throw new Error('Telegram getFile: kein file_path')

  const fileBuffer = await fetch(
    `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`
  )
  return Buffer.from(await fileBuffer.arrayBuffer())
}

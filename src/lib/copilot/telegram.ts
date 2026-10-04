import 'server-only'

import { isStagingSupabase } from '@/lib/auth/staging-admin'
import { TELEGRAM_MAX_MESSAGE_CHARS } from '@/lib/copilot/message-limits'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN ?? ''}`

function isTelegramCatcherActive(): boolean {
  if (process.env.ALLOW_STAGING_REAL_MAIL === '1') return false
  return isStagingSupabase() || process.env.MAIL_CATCHER === '1'
}

function requireTelegramConfig(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID müssen gesetzt sein.')
  }
}

async function sendTelegramOnce(
  text: string,
  parseMode?: 'HTML' | 'Markdown'
): Promise<void> {
  if (isTelegramCatcherActive()) {
    console.info('[mail-catcher:telegram]', {
      chars: text.length,
      parseMode: parseMode ?? null,
      preview: text.slice(0, 120),
      at: new Date().toISOString(),
    })
    return
  }
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

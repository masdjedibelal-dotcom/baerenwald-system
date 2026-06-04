import 'server-only'

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN ?? ''}`

function requireTelegramConfig(): void {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID müssen gesetzt sein.')
  }
}

export async function sendTelegram(text: string, parseMode: 'HTML' | 'Markdown' = 'HTML'): Promise<void> {
  requireTelegramConfig()
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: text.slice(0, 4096),
      parse_mode: parseMode,
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Telegram sendMessage: ${err}`)
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

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

export type ImpersonationPayload = {
  email: string
  roleLabel: string
  targetType: 'kunde' | 'handwerker'
  targetId: string
  adminId: string
  adminEmail: string
  exp: number
  jti: string
}

function secret(): string | null {
  return process.env.PARTNER_INTERNAL_API_SECRET?.trim() || null
}

function sign(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('base64url')
}

export function createImpersonationToken(
  payload: Omit<ImpersonationPayload, 'exp' | 'jti'> & { ttlSeconds?: number }
): string | null {
  const key = secret()
  if (!key) return null

  const full: ImpersonationPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + (payload.ttlSeconds ?? 300),
    jti: randomBytes(16).toString('hex'),
  }

  const body = Buffer.from(JSON.stringify(full)).toString('base64url')
  return `${body}.${sign(body, key)}`
}

export function verifyImpersonationToken(token: string): ImpersonationPayload | null {
  const key = secret()
  if (!key) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [body, sig] = parts
  const expected = sign(body!, key)
  try {
    const a = Buffer.from(sig!)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body!, 'base64url').toString('utf8')
    ) as ImpersonationPayload
    if (!payload.email || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

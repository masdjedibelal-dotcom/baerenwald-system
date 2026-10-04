import { createHmac,randomBytes } from 'crypto'

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

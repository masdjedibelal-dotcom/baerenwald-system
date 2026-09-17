import { supabaseAdmin } from '@/lib/supabase-admin'
import { PARTNER_UPLOAD_BUCKET, storagePathFromHwPdfStored } from '@/lib/partner/handwerker-einreichung'

/**
 * Anzeige-URL für gespeicherte Eintrag-Fotos.
 * HTTPS (z. B. öffentlicher Bucket `protokolle`) sofort zurück — kein Storage-Roundtrip.
 * Relativpfade → Signed URL aus `handwerker-uploads`.
 */
export async function resolveEintragFotoDisplayUrl(
  stored: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  const raw = String(stored ?? '').trim()
  if (!raw) return null
  if (/^https?:\/\//i.test(raw)) return raw
  return signedHandwerkerUploadUrl(raw, expiresIn)
}

export async function resolveEintragFotoDisplayUrls(
  storedList: Array<string | null | undefined>,
  expiresIn = 3600
): Promise<(string | null)[]> {
  return Promise.all(storedList.map((s) => resolveEintragFotoDisplayUrl(s, expiresIn)))
}

export async function signedHandwerkerUploadUrl(
  stored: string | null | undefined,
  expiresIn = 3600
): Promise<string | null> {
  const path = storagePathFromHwPdfStored(stored)
  if (!path) {
    if (stored?.trim() && /^https?:\/\//i.test(stored.trim())) return stored.trim()
    return null
  }
  const { data, error } = await supabaseAdmin.storage
    .from(PARTNER_UPLOAD_BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

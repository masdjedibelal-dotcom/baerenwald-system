import { supabaseAdmin } from '@/lib/supabase-admin'
import { PARTNER_UPLOAD_BUCKET, storagePathFromHwPdfStored } from '@/lib/partner/handwerker-einreichung'

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

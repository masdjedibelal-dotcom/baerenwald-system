'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'

import {
  FACHDOKU_SLOT_DEFS,
  fachdokuCodesFromGewerke,
  type FachdokuSlotCode,
  type FachdokuSlotRow,
} from '@/lib/auftraege/fachdoku-slots'
import { PARTNER_UPLOAD_BUCKET } from '@/lib/partner/handwerker-einreichung'
import { signedHandwerkerUploadUrl } from '@/lib/partner/handwerker-uploads'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function assertCrmUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, message: 'Nicht angemeldet' }
  return { ok: true as const, userId: user.id }
}

async function gewerkeForAuftrag(auftragId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('auftrag_positionen')
    .select('gewerk_name')
    .eq('auftrag_id', auftragId)
  return (data ?? [])
    .map((r) => String((r as { gewerk_name?: string | null }).gewerk_name ?? ''))
    .filter(Boolean)
}

export async function ensureAndLoadFachdokuSlots(
  auftragId: string
): Promise<{ ok: true; slots: FachdokuSlotRow[] } | { ok: false; message: string }> {
  const gate = await assertCrmUser()
  if (!gate.ok) return gate

  const id = auftragId.trim()
  if (!id) return { ok: false, message: 'Auftrag fehlt' }

  const { data: auf } = await supabaseAdmin.from('auftraege').select('id').eq('id', id).maybeSingle()
  if (!auf) return { ok: false, message: 'Auftrag nicht gefunden' }

  const gewerke = await gewerkeForAuftrag(id)
  const codes = fachdokuCodesFromGewerke(gewerke)
  if (codes.length) {
    const rows = codes.map((code: FachdokuSlotCode) => ({
      auftrag_id: id,
      slot_code: code,
      label: FACHDOKU_SLOT_DEFS[code].label,
      status: 'offen' as const,
    }))
    await supabaseAdmin.from('auftrag_fachdoku_slots').upsert(rows, {
      onConflict: 'auftrag_id,slot_code',
      ignoreDuplicates: true,
    })
  }

  const { data, error } = await supabaseAdmin
    .from('auftrag_fachdoku_slots')
    .select(
      'id, auftrag_id, slot_code, label, status, datei_url, datei_name, uploaded_by_role, erledigt_am'
    )
    .eq('auftrag_id', id)
    .order('slot_code')

  if (error) return { ok: false, message: error.message }

  const slots: FachdokuSlotRow[] = []
  for (const row of data ?? []) {
    const r = row as FachdokuSlotRow
    const signed = r.datei_url ? await signedHandwerkerUploadUrl(r.datei_url) : null
    slots.push({ ...r, signed_url: signed })
  }
  return { ok: true, slots }
}

export async function uploadCrmFachdokuSlot(input: {
  auftragId: string
  slotId: string
  file: File
}): Promise<{ ok: true; slots: FachdokuSlotRow[] } | { ok: false; message: string }> {
  const gate = await assertCrmUser()
  if (!gate.ok) return gate

  const auftragId = input.auftragId.trim()
  const slotId = input.slotId.trim()
  if (!auftragId || !slotId) return { ok: false, message: 'Angaben unvollständig' }
  if (!input.file?.size) return { ok: false, message: 'Keine Datei' }

  const { data: slot } = await supabaseAdmin
    .from('auftrag_fachdoku_slots')
    .select('id, slot_code')
    .eq('id', slotId)
    .eq('auftrag_id', auftragId)
    .maybeSingle()
  if (!slot) return { ok: false, message: 'Slot nicht gefunden' }

  const mime = input.file.type || 'application/pdf'
  const isPdf = mime === 'application/pdf' || input.file.name.toLowerCase().endsWith('.pdf')
  const ext = isPdf
    ? 'pdf'
    : mime.includes('png')
      ? 'png'
      : mime.includes('webp')
        ? 'webp'
        : 'jpg'
  const path = `crm/fachdoku/${auftragId}/${String(slot.slot_code)}-${randomUUID()}.${ext}`
  const buf = Buffer.from(await input.file.arrayBuffer())

  const { error: upErr } = await supabaseAdmin.storage.from(PARTNER_UPLOAD_BUCKET).upload(path, buf, {
    contentType: isPdf ? 'application/pdf' : mime,
    upsert: false,
  })
  if (upErr) return { ok: false, message: upErr.message }

  const now = new Date().toISOString()
  const { error } = await supabaseAdmin
    .from('auftrag_fachdoku_slots')
    .update({
      status: 'erledigt',
      datei_url: path,
      datei_name: input.file.name.slice(0, 200),
      uploaded_by_role: 'crm',
      uploaded_by_user_id: gate.userId,
      erledigt_am: now,
      updated_at: now,
    })
    .eq('id', slotId)
    .eq('auftrag_id', auftragId)

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/auftraege/${auftragId}`)
  return ensureAndLoadFachdokuSlots(auftragId)
}

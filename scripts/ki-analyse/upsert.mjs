/** @param {import('@supabase/supabase-js').SupabaseClient} supabase */
export async function upsertKiAnalyse(supabase, { bereich, analyse_key, titel, sample_size, ergebnis, narrative = null }) {
  const row = {
    bereich,
    analyse_key,
    titel,
    ergebnis,
    narrative,
    sample_size,
    generiert_am: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ki_cluster_analysen')
    .upsert(row, { onConflict: 'bereich,analyse_key' })
    .select()
    .single()

  if (error) throw new Error(`ki_cluster_analysen: ${error.message}`)
  return data
}

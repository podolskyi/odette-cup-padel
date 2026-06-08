import { createClient } from '@supabase/supabase-js'

// Public client config. The publishable key is browser-safe (Supabase: "can be
// safely shared publicly") — access is governed by Row Level Security policies.
// Hard-coded defaults so the static deploy works with no extra env setup;
// overridable via env if we ever rotate keys.
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://cyzbflzkbsggwidrqxax.supabase.co'
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_QpkfawuTUuZnYvXugv51uQ_TSDT_H4L'

export const supabaseConfigured = Boolean(url && key)
export const supabase = supabaseConfigured ? createClient(url!, key!) : null

// Single shared row holding the organizer's merge-review state.
const TABLE = 'merge_review'
const ROW_ID = 'draft'

export interface ReviewState {
  aliases: Record<string, string>
  dates: Record<string, string>
  updated_at?: string
}

export async function loadReview(): Promise<ReviewState | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('aliases,dates,updated_at')
    .eq('id', ROW_ID)
    .maybeSingle()
  if (error) throw error
  return data as ReviewState | null
}

export async function saveReview(aliases: ReviewState['aliases'], dates: ReviewState['dates']): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const updated_at = new Date().toISOString()
  const { error } = await supabase.from(TABLE).upsert({ id: ROW_ID, aliases, dates, updated_at })
  if (error) throw error
  return updated_at
}

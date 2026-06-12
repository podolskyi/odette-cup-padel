import { createClient } from '@supabase/supabase-js'
import type { Tournament } from '../types'

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

// --- Community tournaments (the live "Add tournament" feature) --------------

const COMMUNITY_TABLE = 'community_tournaments'
const ALIASES_TABLE = 'community_aliases'
const ALIASES_ROW = 'live'

/** Fetch a round page's raw HTML via the CORS-bypassing edge function. */
export async function fetchAmericanoHtml(url: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase.functions.invoke('fetch-americano', { body: { url } })
  if (error) throw new Error(error.message || 'Could not reach the importer')
  if (!data?.html) throw new Error(data?.error || 'Empty response from the importer')
  return data.html as string
}

export interface CommunityData {
  tournaments: Tournament[]
  aliases: Record<string, string>
}

/** Load all community-added tournaments and the shared alias map. */
export async function loadCommunity(): Promise<CommunityData> {
  if (!supabase) return { tournaments: [], aliases: {} }
  const [tRes, aRes] = await Promise.all([
    supabase.from(COMMUNITY_TABLE).select('data'),
    supabase.from(ALIASES_TABLE).select('map').eq('id', ALIASES_ROW).maybeSingle(),
  ])
  if (tRes.error) throw tRes.error
  if (aRes.error) throw aRes.error
  return {
    tournaments: (tRes.data ?? []).map((r) => r.data as Tournament),
    aliases: (aRes.data?.map as Record<string, string>) ?? {},
  }
}

/** Upsert one tournament (keyed by its americano-padel id, so re-adds replace). */
export async function saveCommunityTournament(t: Tournament): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.from(COMMUNITY_TABLE).upsert({ id: t.id, data: t })
  if (error) throw error
}

/** Replace the shared alias map (read-modify-write; fine for low concurrency). */
export async function saveCommunityAliases(map: Record<string, string>): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase
    .from(ALIASES_TABLE)
    .upsert({ id: ALIASES_ROW, map, updated_at: new Date().toISOString() })
  if (error) throw error
}

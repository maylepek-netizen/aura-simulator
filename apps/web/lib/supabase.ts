import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (_supabase) return _supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  _supabase = createClient(url, key)
  return _supabase
}

export async function saveSimulationToSupabase(simulation: {
  situation: string
  video_url: string
  internal_thoughts: string
  sensory_load: number
  emotional_landscape: string
  soundscape: string
  objective: string
  visual_effect: string
  ambient_sound: string
}) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('simulations')
    .insert([simulation])
  if (error) console.error('Supabase save error:', error)
  return data
}

// Replace a simulation's temporary video-proxy URL with a permanent Cloudinary URL.
export async function updateSimulationVideoUrl(id: string | number, cloudinaryUrl: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('simulations')
    .update({ video_url: cloudinaryUrl })
    .eq('id', id)
  if (error) console.error('Supabase video_url update error:', error)
  return data
}

// NOTE: getSupabase() is client-only (it bails when there is no `window`), so
// this helper is for client-side use. Server-side cleanup in the
// upload-to-cloudinary route creates its own client.
export async function deleteSimulation(id: number) {
  const supabase = getSupabase()
  if (!supabase) return
  const { error } = await supabase.from('simulations').delete().eq('id', id)
  if (error) console.error('Supabase delete error:', error)
}

export async function getSimulationsFromSupabase() {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .filter('video_url', 'like', 'https://res.cloudinary.com%')
    .order('created_at', { ascending: false })
  if (error) console.error('Supabase fetch error:', error)
  return data || []
}

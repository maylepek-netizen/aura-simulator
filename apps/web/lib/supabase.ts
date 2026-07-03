import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveSimulationToSupabase(simulation: {
  situation: string
  video_url: string
  internal_thoughts: string
  sensory_load: number
  emotional_landscape: string
  soundscape: string
  objective: string
  visual_effect: string
}) {
  const { data, error } = await supabase
    .from('simulations')
    .insert([simulation])

  if (error) console.error('Supabase save error:', error)
  return data
}

export async function getSimulationsFromSupabase() {
  const { data, error } = await supabase
    .from('simulations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('Supabase fetch error:', error)
  return data || []
}

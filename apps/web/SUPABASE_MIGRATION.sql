-- Run this ONCE in the Supabase dashboard → SQL Editor for project bofduginwcsbiqhdsmdd.
-- It adds the ambient_sound column that the app now writes, so explore can
-- reconstruct the full soundscape for new simulations.

alter table public.simulations
  add column if not exists ambient_sound text default '';

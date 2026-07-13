// Shared ambient-sound mapping — the single source of truth for both the main
// result playback and the explore playback. Keys are the `ambient_sound`
// category strings produced by /api/simulate; values are static files in
// public/sounds/.

export const SOUND_MAP: Record<string, string> = {
  crowd: "/sounds/mall.wav",
  children: "/sounds/classroom.wav",
  storm: "/sounds/storm.wav",
  alarm: "/sounds/alarm.mp3",
  restaurant: "/sounds/resturant.wav",
  transport: "/sounds/train.wav",
  nature: "/sounds/nature.wav",
  party: "/sounds/party.wav",
  classroom: "/sounds/classroom.wav",
  street: "/sounds/street.m4a",
  hospital: "/sounds/hospital.m4a",
  home: "/sounds/home.m4a",
  supermarket: "/sounds/supermarket.m4a",
  office: "/sounds/office.m4a",
  beach: "/sounds/beach.m4a",
  construction: "/sounds/construction.m4a",
  library: "/sounds/library.m4a",
  sports: "/sounds/sports.wav",
  airport: "/sounds/airport.m4a",
  cafe: "/sounds/cafe.m4a",
  nightclub: "/sounds/nightclub.m4a",
  traffic: "/sounds/highway.m4a",
  park: "/sounds/birds.m4a",
  baby: "/sounds/baby.m4a",
  dogs: "/sounds/dogs.m4a",
  forest: "/sounds/forest.m4a",
  rain: "/sounds/rain.m4a",
};

export const AMBIENT_FALLBACK = "/sounds/mall.wav";

// Resolve an ambient_sound category string to a sound file URL.
export function resolveAmbientSound(category: string | undefined | null): string | null {
  if (!category) return null;
  const c = category.toLowerCase().trim();
  return (
    SOUND_MAP[c] ??
    Object.entries(SOUND_MAP).find(([key]) => c.includes(key))?.[1] ??
    AMBIENT_FALLBACK
  );
}

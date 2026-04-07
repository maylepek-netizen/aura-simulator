export type Gender = "Female" | "Male" | "Non-binary" | "Prefer not to say";

export type OnboardingProfile = {
  name: string;
  age: number;
  gender: Gender;
};

export type ExperienceDraft = {
  situation: string;
  createdAtIso: string;
};

const PROFILE_KEY = "aura.profile.v1";
const EXPERIENCE_KEY = "aura.experience.v1";

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveProfile(profile: OnboardingProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadProfile(): OnboardingProfile | null {
  const v = safeParseJSON<OnboardingProfile>(localStorage.getItem(PROFILE_KEY));
  if (!v) return null;
  if (!v.name || typeof v.name !== "string") return null;
  if (typeof v.age !== "number" || !Number.isFinite(v.age)) return null;
  if (!v.gender || typeof v.gender !== "string") return null;
  return v;
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function saveExperienceDraft(draft: ExperienceDraft) {
  localStorage.setItem(EXPERIENCE_KEY, JSON.stringify(draft));
}

export function loadExperienceDraft(): ExperienceDraft | null {
  const v = safeParseJSON<ExperienceDraft>(
    localStorage.getItem(EXPERIENCE_KEY),
  );
  if (!v) return null;
  if (!v.situation || typeof v.situation !== "string") return null;
  if (!v.createdAtIso || typeof v.createdAtIso !== "string") return null;
  return v;
}

export function clearExperienceDraft() {
  localStorage.removeItem(EXPERIENCE_KEY);
}


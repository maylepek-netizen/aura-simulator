const STORAGE_KEY = "aura_simulations";
const MAX_RECORDS = 100;

export type SimulationRecord = {
  id: string;
  situation: string;
  name: string;
  age: number;
  gender: string;
  result: object;
  videoUri: string;
  createdAt: string;
};

export function loadSimulations(): SimulationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SimulationRecord[];
  } catch {
    return [];
  }
}

export function saveSimulation(
  data: Omit<SimulationRecord, "id" | "createdAt">
): SimulationRecord {
  const record: SimulationRecord = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  const records = loadSimulations();
  records.push(record);
  const trimmed = records.slice(-MAX_RECORDS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage quota exceeded — silently fail
  }
  return record;
}

export function getSimulationById(id: string): SimulationRecord | null {
  return loadSimulations().find((r) => r.id === id) ?? null;
}

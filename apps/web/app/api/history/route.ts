import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "simulations.json");

async function readSimulations(): Promise<SimulationRecord[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw) as SimulationRecord[];
  } catch {
    return [];
  }
}

async function writeSimulations(records: SimulationRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(records, null, 2), "utf-8");
}

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

export async function GET() {
  const records = await readSimulations();
  // Return newest first
  return NextResponse.json(records.slice().reverse());
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<SimulationRecord, "id" | "createdAt">;
    const record: SimulationRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      situation: body.situation,
      name: body.name,
      age: body.age,
      gender: body.gender,
      result: body.result,
      videoUri: body.videoUri,
    };
    const records = await readSimulations();
    records.push(record);
    // Keep at most 100 entries to avoid unbounded growth
    const trimmed = records.slice(-100);
    await writeSimulations(trimmed);
    return NextResponse.json({ id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

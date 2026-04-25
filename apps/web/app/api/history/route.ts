import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";

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

const BLOB_FILENAME = "simulations.json";

async function readSimulations(): Promise<SimulationRecord[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    if (blobs.length === 0) return [];
    const res = await fetch(blobs[0].url);
    if (!res.ok) return [];
    return (await res.json()) as SimulationRecord[];
  } catch {
    return [];
  }
}

async function writeSimulations(records: SimulationRecord[]): Promise<void> {
  // Delete existing blob first to avoid accumulating versions
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    if (blobs.length > 0) {
      await del(blobs.map((b) => b.url));
    }
  } catch {}
  await put(BLOB_FILENAME, JSON.stringify(records), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function GET() {
  try {
    const records = await readSimulations();
    return NextResponse.json(records.slice().reverse()); // newest first
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
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
    await writeSimulations(records.slice(-100));
    return NextResponse.json({ id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

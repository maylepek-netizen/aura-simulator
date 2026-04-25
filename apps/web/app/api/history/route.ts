import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

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

const INDEX_KEY = "simulations:index";

export async function GET() {
  try {
    const ids: string[] = (await kv.lrange(INDEX_KEY, 0, 99)) ?? [];
    if (ids.length === 0) return NextResponse.json([]);
    const records = await Promise.all(
      ids.map((id) => kv.get<SimulationRecord>("simulation:" + id))
    );
    const valid = records.filter(Boolean) as SimulationRecord[];
    // newest first (index is pushed with latest at head)
    return NextResponse.json(valid);
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
    await kv.set("simulation:" + record.id, record);
    // prepend to index list, trim to 100
    await kv.lpush(INDEX_KEY, record.id);
    await kv.ltrim(INDEX_KEY, 0, 99);
    return NextResponse.json({ id: record.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

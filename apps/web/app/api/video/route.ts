import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const VEO_MODEL = "veo-2.0-generate-001";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // Step 1: Start video generation
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { aspectRatio: "16:9", sampleCount: 1, durationSeconds: 5, resolution: "480p" }
        })
      }
    );

    if (!startRes.ok) {
      const err = await startRes.json();
      return NextResponse.json({ error: err?.error?.message ?? "Veo error" }, { status: 502 });
    }

    const { name: operationName } = await startRes.json();

    // Step 2: Poll until done (max 3 minutes)
    for (let i = 0; i < 36; i++) {
      await new Promise(r => setTimeout(r, 5000));
      
      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`
      );
      const pollData = await pollRes.json();

      if (pollData.done) {
        const uri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) return NextResponse.json({ error: "No video URI" }, { status: 500 });
        
        // Step 3: Download and return as base64
        const videoRes = await fetch(`${uri}&key=${API_KEY}`);
        const buffer = await videoRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        
        return NextResponse.json({ 
          video: `data:video/mp4;base64,${base64}`,
          uri 
        });
      }
    }

    return NextResponse.json({ error: "Timeout - video took too long" }, { status: 408 });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 200;

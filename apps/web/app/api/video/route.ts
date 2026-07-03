import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const VEO_MODEL = "veo-3.1-lite-generate-preview";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const finalPrompt = prompt;

    const instance: Record<string, unknown> = { prompt: finalPrompt };
    if (imageBase64) {
      instance.image = { bytesBase64Encoded: imageBase64, mimeType: "image/png" };
    }

    // Step 1: Start video generation
    const startRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VEO_MODEL}:predictLongRunning?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [instance],
          parameters: {
            aspectRatio: "16:9",
            sampleCount: 1,
            durationSeconds: 8,
          },
        }),
      }
    );

    if (!startRes.ok) {
      const errText = await startRes.text();
      console.error("Veo API error raw:", errText);
      let errData: Record<string, unknown> = {};
      try { errData = JSON.parse(errText); } catch { errData = { raw: errText }; }
      return NextResponse.json({ error: (errData as any)?.error?.message ?? "Veo error", details: errData }, { status: 502 });
    }

    const startText = await startRes.text();

    if (!startText) {
      return NextResponse.json({ error: "Empty response from Veo API" }, { status: 502 });
    }

    const { name: operationName } = JSON.parse(startText);

    // Step 2: Poll until done (max 5 minutes, 60 × 5s)
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`
      );
      const pollText = await pollRes.text();
      if (!pollText) continue;
      let pollData;
      try {
        pollData = JSON.parse(pollText);
      } catch {
        continue;
      }

      if (pollData.done) {
        const uri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) return NextResponse.json({ error: "No video URI" }, { status: 500 });

        // Return the raw URI — client will fetch via /api/video-proxy to keep the key server-side
        return NextResponse.json({ uri });
      }
    }

    return NextResponse.json({ error: "Timeout - video took too long" }, { status: 408 });
  } catch (err) {
    console.error("Video route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 200;

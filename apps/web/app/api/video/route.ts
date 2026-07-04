import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const VEO_MODEL = "veo-3.1-fast-generate-preview";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64 } = await req.json();

    const finalPrompt = prompt;

    const instance: Record<string, unknown> = { prompt: finalPrompt };
    if (imageBase64) {
      instance.image = { bytesBase64Encoded: imageBase64, mimeType: "image/png" };
    }

    console.log("VIDEO PROMPT SENT TO VEO:", finalPrompt);

    // Start video generation and return the operation name immediately.
    // The client polls /api/video-status to avoid the serverless timeout.
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

    if (!operationName) {
      return NextResponse.json({ error: "No operation name from Veo API" }, { status: 502 });
    }

    return NextResponse.json({ operationName });
  } catch (err) {
    console.error("Video route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;

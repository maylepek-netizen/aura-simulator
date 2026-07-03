import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const VEO_MODEL = "veo-002";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageBase64 } = await req.json();

    // Convert JSON video_prompt object to natural language string if needed
    let finalPrompt = prompt;
    try {
      const parsed = JSON.parse(prompt);
      if (parsed && typeof parsed === "object") {
        // Flatten the video_prompt object fields into a readable paragraph
        const p = parsed as Record<string, unknown>;
        const loopSettings = p.loop_settings as Record<string, string> | undefined;
        finalPrompt = [
          p.style, p.subject, p.environment, p.lighting,
          p.camera, p.motion, p.focus, p.sensory_distortion,
          loopSettings?.loop_type, loopSettings?.frame_matching, loopSettings?.motion_continuity,
          p.audio,
        ].filter(Boolean).join(". ");
      }
    } catch {
      finalPrompt = prompt;
    }

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
            negativePrompt: "person's own body, hands, feet, selfie angle, multiple locations, narrative sequence, text on screen, unnatural motion, horror elements, cartoon style",
          },
        }),
      }
    );

    if (!startRes.ok) {
      const err = await startRes.json();
      console.error("Veo API error:", JSON.stringify(err));
      return NextResponse.json({ error: err?.error?.message ?? "Veo error", details: err }, { status: 502 });
    }

    const { name: operationName } = await startRes.json();

    // Step 2: Poll until done (max 5 minutes, 60 × 5s)
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`
      );
      const pollData = await pollRes.json();

      if (pollData.done) {
        const uri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        if (!uri) return NextResponse.json({ error: "No video URI" }, { status: 500 });

        // Return the raw URI — client will fetch via /api/video-proxy to keep the key server-side
        return NextResponse.json({ uri });
      }
    }

    return NextResponse.json({ error: "Timeout - video took too long" }, { status: 408 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 200;

import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { operationName } = await req.json();

    if (!operationName) {
      return NextResponse.json({ error: "Missing operationName" }, { status: 400 });
    }

    // Check the long-running operation status once. The client calls this
    // repeatedly (every ~7s) until { done: true } comes back.
    const pollRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${API_KEY}`
    );

    console.log("video-status poll response status:", pollRes.status);

    const pollText = await pollRes.text();
    console.log("video-status poll response body:", pollText.substring(0, 500));

    if (!pollRes.ok) {
      console.error("Veo status error raw:", pollText);
      let errData: Record<string, unknown> = {};
      try { errData = JSON.parse(pollText); } catch { errData = { raw: pollText }; }
      return NextResponse.json({ error: (errData as any)?.error?.message ?? "Veo status error", details: errData }, { status: 502 });
    }

    // Empty/unparseable body — treat as "not done yet" so the client keeps polling.
    if (!pollText) {
      return NextResponse.json({ done: false });
    }

    let pollData;
    try {
      pollData = JSON.parse(pollText);
    } catch {
      return NextResponse.json({ done: false });
    }

    if (pollData.done) {
      const uri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) {
        return NextResponse.json({ error: "No video URI" }, { status: 500 });
      }
      // Return the raw URI — client fetches via /api/video-proxy to keep the key server-side.
      return NextResponse.json({ done: true, uri });
    }

    return NextResponse.json({ done: false });
  } catch (err) {
    console.error("Video status route error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;

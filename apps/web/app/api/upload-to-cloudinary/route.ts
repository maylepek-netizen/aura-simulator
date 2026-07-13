import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY!;
const CLOUD_NAME = "duhsqezo3";
// Unsigned upload preset — created once in the Cloudinary dashboard.
// Override via env if you name it differently.
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "aura_simulations";

// Fetches the freshly-generated Veo video from Google (while its link is still
// alive) and re-uploads it to Cloudinary for permanent storage, returning the
// permanent Cloudinary URL. This solves the expiring-Veo-link problem.
export async function POST(req: NextRequest) {
  try {
    const { videoUri } = await req.json();

    if (!videoUri || typeof videoUri !== "string") {
      return NextResponse.json({ error: "Missing videoUri" }, { status: 400 });
    }
    // Only accept Google's generativelanguage domain (same guard as video-proxy).
    if (!videoUri.startsWith("https://generativelanguage.googleapis.com/")) {
      return NextResponse.json({ error: "Invalid videoUri" }, { status: 400 });
    }

    // 1. Pull the video from Google while the link is still valid.
    const sep = videoUri.includes("?") ? "&" : "?";
    const videoRes = await fetch(`${videoUri}${sep}key=${API_KEY}`);
    if (!videoRes.ok) {
      const body = await videoRes.text().catch(() => "");
      console.error("Cloudinary upload — source fetch failed:", videoRes.status, body.slice(0, 200));
      return NextResponse.json({ error: "Failed to fetch source video" }, { status: 502 });
    }
    const videoBlob = await videoRes.blob();

    // 2. Unsigned upload to Cloudinary.
    const form = new FormData();
    form.append("file", videoBlob);
    form.append("upload_preset", UPLOAD_PRESET);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
      { method: "POST", body: form }
    );

    const uploadText = await uploadRes.text();
    if (!uploadRes.ok) {
      console.error("Cloudinary upload failed:", uploadRes.status, uploadText.slice(0, 300));
      let msg = "Cloudinary upload failed";
      try { msg = JSON.parse(uploadText)?.error?.message ?? msg; } catch {}
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = JSON.parse(uploadText);
    const url: string | undefined = data.secure_url ?? data.url;
    if (!url) {
      return NextResponse.json({ error: "No URL returned from Cloudinary" }, { status: 502 });
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("upload-to-cloudinary error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const maxDuration = 60;
